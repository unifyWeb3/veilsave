// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity 0.8.27;

import {
    FHE,
    eaddress,
    ebool,
    euint64,
    euint128,
    externalEuint64
} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @notice Disposable validation contract. It is intentionally not production-ready.
contract EncryptedWeightedDrawSpike is ZamaEthereumConfig {
    enum Phase {
        Open,
        Frozen,
        RandomReady,
        Drawn
    }

    error InvalidSlotCount(uint256 slotCount);
    error DuplicateSlot(address slot);
    error InvalidPhase(Phase expected, Phase actual);
    error Unauthorized(address caller);
    error InvalidWeightsLength(uint256 expected, uint256 actual);
    error WeightsNotLoaded();
    error DebugNotCaptured();

    address public immutable controller;
    uint256 public immutable slotCount;
    Phase public phase;
    uint64 public randomWord;
    bool public weightsLoaded;
    bool public debugCaptured;

    address[] private _slots;
    euint64[] private _weights;
    euint64[] private _lastPrefixes;

    euint64 private _lastTotal;
    euint64 private _lastThreshold;
    ebool private _lastOverflow;
    eaddress private _encryptedWinner;

    event WeightsLoaded();
    event WeightsFrozen();
    event RandomWordStored(uint64 randomWord);
    event DrawExecuted(bytes32 indexed encryptedWinner, bool debugCaptured);
    event Reset();

    modifier onlyController() {
        if (msg.sender != controller) revert Unauthorized(msg.sender);
        _;
    }

    modifier atPhase(Phase expected) {
        if (phase != expected) revert InvalidPhase(expected, phase);
        _;
    }

    constructor(address[] memory slots_) {
        uint256 count = slots_.length;
        if (count < 2 || count > 32 || (count & (count - 1)) != 0) {
            revert InvalidSlotCount(count);
        }

        controller = msg.sender;
        slotCount = count;

        for (uint256 i = 0; i < count; ++i) {
            address slotAddress = slots_[i];
            if (slotAddress != address(0)) {
                for (uint256 j = 0; j < i; ++j) {
                    if (slots_[j] == slotAddress) revert DuplicateSlot(slotAddress);
                }
            }
            _slots.push(slotAddress);
            _weights.push();
            _lastPrefixes.push();
        }
    }

    function slot(uint256 index) external view returns (address) {
        return _slots[index];
    }

    function encryptedWinner() external view returns (eaddress) {
        return _encryptedWinner;
    }

    function encryptedTotal() external view returns (euint64) {
        return _lastTotal;
    }

    function encryptedThreshold() external view returns (euint64) {
        return _lastThreshold;
    }

    function encryptedOverflow() external view returns (ebool) {
        return _lastOverflow;
    }

    function encryptedPrefix(uint256 index) external view returns (euint64) {
        return _lastPrefixes[index];
    }

    function isWinnerPubliclyDecryptable() external view returns (bool) {
        return FHE.isPubliclyDecryptable(_encryptedWinner);
    }

    function loadWeights(
        externalEuint64[] calldata encryptedWeights,
        bytes calldata inputProof
    ) external onlyController atPhase(Phase.Open) {
        if (encryptedWeights.length != slotCount) {
            revert InvalidWeightsLength(slotCount, encryptedWeights.length);
        }

        for (uint256 i = 0; i < slotCount; ++i) {
            euint64 weight = FHE.fromExternal(encryptedWeights[i], inputProof);
            if (_slots[i] == address(0)) {
                weight = FHE.asEuint64(0);
            }
            _weights[i] = weight;
            FHE.allowThis(_weights[i]);
        }

        weightsLoaded = true;
        emit WeightsLoaded();
    }

    function freezeWeights() external onlyController atPhase(Phase.Open) {
        if (!weightsLoaded) revert WeightsNotLoaded();
        phase = Phase.Frozen;
        emit WeightsFrozen();
    }

    /// @dev Models a VRF callback that stores only the public word.
    function storeRandomWord(uint64 word) external onlyController atPhase(Phase.Frozen) {
        randomWord = word;
        phase = Phase.RandomReady;
        emit RandomWordStored(word);
    }

    /// @dev Executes the FHE draw in a transaction separate from random-word storage.
    function executeDraw(bool captureDebug) external atPhase(Phase.RandomReady) {
        euint128[] memory wideWeights = new euint128[](slotCount);
        for (uint256 i = 0; i < slotCount; ++i) {
            wideWeights[i] = FHE.asEuint128(_weights[i]);
        }

        // Balanced reduction: N-1 euint128 additions, O(log N) dependency depth.
        for (uint256 stride = 1; stride < slotCount; stride <<= 1) {
            uint256 step = stride << 1;
            for (uint256 i = 0; i < slotCount; i += step) {
                wideWeights[i] = FHE.add(wideWeights[i], wideWeights[i + stride]);
            }
        }

        euint128 wideTotal = wideWeights[0];
        ebool overflow = FHE.gt(wideTotal, uint128(type(uint64).max));
        euint64 zero = FHE.asEuint64(0);
        euint64 safeTotal = FHE.select(overflow, zero, FHE.asEuint64(wideTotal));

        euint64[] memory prefixes = new euint64[](slotCount);
        for (uint256 i = 0; i < slotCount; ++i) {
            prefixes[i] = FHE.select(overflow, zero, _weights[i]);
        }

        // Balanced inclusive scan. Each level combines the right half of a block
        // with the already-computed total of its left half.
        for (uint256 blockSize = 2; blockSize <= slotCount; blockSize <<= 1) {
            uint256 half = blockSize >> 1;
            for (uint256 blockStart = 0; blockStart < slotCount; blockStart += blockSize) {
                euint64 leftTotal = prefixes[blockStart + half - 1];
                for (uint256 i = blockStart + half; i < blockStart + blockSize; ++i) {
                    prefixes[i] = FHE.add(prefixes[i], leftTotal);
                }
            }
        }

        euint128 product = FHE.mul(FHE.asEuint128(safeTotal), uint128(randomWord));
        euint64 threshold = FHE.asEuint64(FHE.shr(product, 64));

        eaddress winner = FHE.asEaddress(address(0));
        ebool previousCross = FHE.asEbool(false);

        for (uint256 i = 0; i < slotCount; ++i) {
            ebool cross = FHE.lt(threshold, prefixes[i]);
            ebool match_ = i == 0 ? cross : FHE.and(cross, FHE.not(previousCross));
            winner = FHE.select(match_, FHE.asEaddress(_slots[i]), winner);
            previousCross = cross;
        }

        _lastTotal = safeTotal;
        _lastThreshold = threshold;
        _lastOverflow = overflow;
        _encryptedWinner = winner;
        debugCaptured = captureDebug;

        FHE.allowThis(_lastTotal);
        FHE.allowThis(_lastThreshold);
        FHE.allowThis(_lastOverflow);
        FHE.allowThis(_encryptedWinner);
        FHE.makePubliclyDecryptable(_encryptedWinner);

        if (captureDebug) {
            for (uint256 i = 0; i < slotCount; ++i) {
                _lastPrefixes[i] = prefixes[i];
                FHE.allowThis(_lastPrefixes[i]);
            }
        }

        phase = Phase.Drawn;
        emit DrawExecuted(eaddress.unwrap(_encryptedWinner), captureDebug);
    }

    /// @dev Test-only ACL grant, intentionally excluded from draw HCU/gas measurement.
    function grantDebugAccess(address observer) external onlyController atPhase(Phase.Drawn) {
        if (!debugCaptured) revert DebugNotCaptured();
        FHE.allow(_lastTotal, observer);
        FHE.allow(_lastThreshold, observer);
        FHE.allow(_lastOverflow, observer);
        for (uint256 i = 0; i < slotCount; ++i) {
            FHE.allow(_lastPrefixes[i], observer);
        }
    }

    /// @dev Test-only state reset so deterministic vectors can reuse one deployment.
    function reset() external onlyController atPhase(Phase.Drawn) {
        phase = Phase.Open;
        randomWord = 0;
        weightsLoaded = false;
        debugCaptured = false;
        _lastTotal = euint64.wrap(bytes32(0));
        _lastThreshold = euint64.wrap(bytes32(0));
        _lastOverflow = ebool.wrap(bytes32(0));
        _encryptedWinner = eaddress.wrap(bytes32(0));
        for (uint256 i = 0; i < slotCount; ++i) {
            _weights[i] = euint64.wrap(bytes32(0));
            _lastPrefixes[i] = euint64.wrap(bytes32(0));
        }
        emit Reset();
    }
}
