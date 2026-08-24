// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity 0.8.27;

import {
    FHE,
    eaddress,
    euint64,
    externalEaddress,
    externalEuint64
} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @notice Disposable proof/ACL harness. It is intentionally not production-ready.
contract WinnerRevealAclSpike is ZamaEthereumConfig {
    enum EpochStatus {
        Unset,
        RevealReady,
        Finalized,
        NoWinner
    }

    struct Epoch {
        eaddress encryptedWinner;
        euint64 encryptedPrize;
        address finalizedWinner;
        EpochStatus status;
    }

    error Unauthorized(address caller);
    error InvalidEpoch(uint64 epochId);
    error EpochAlreadyExists(uint64 epochId);
    error EpochNotRevealReady(uint64 epochId, EpochStatus actual);

    address public immutable controller;
    mapping(uint64 epochId => Epoch epoch) private _epochs;

    event EpochPrepared(uint64 indexed epochId, bytes32 encryptedWinner, bytes32 encryptedPrize);
    event WinnerFinalized(uint64 indexed epochId, address indexed winner);
    event NoWinnerFinalized(uint64 indexed epochId);

    modifier onlyController() {
        if (msg.sender != controller) revert Unauthorized(msg.sender);
        _;
    }

    constructor() {
        controller = msg.sender;
    }

    function prepareEpoch(
        uint64 epochId,
        externalEaddress winnerInput,
        externalEuint64 prizeInput,
        bytes calldata inputProof
    ) external onlyController {
        if (epochId == 0) revert InvalidEpoch(epochId);

        Epoch storage epoch = _epochs[epochId];
        if (epoch.status != EpochStatus.Unset) revert EpochAlreadyExists(epochId);

        epoch.encryptedWinner = FHE.fromExternal(winnerInput, inputProof);
        epoch.encryptedPrize = FHE.fromExternal(prizeInput, inputProof);
        epoch.status = EpochStatus.RevealReady;

        FHE.allowThis(epoch.encryptedWinner);
        FHE.allowThis(epoch.encryptedPrize);
        FHE.makePubliclyDecryptable(epoch.encryptedWinner);

        emit EpochPrepared(
            epochId,
            FHE.toBytes32(epoch.encryptedWinner),
            FHE.toBytes32(epoch.encryptedPrize)
        );
    }

    function finalizeWinner(
        uint64 epochId,
        bytes calldata abiEncodedWinner,
        bytes calldata decryptionProof
    ) external {
        Epoch storage epoch = _epochs[epochId];
        if (epoch.status != EpochStatus.RevealReady) {
            revert EpochNotRevealReady(epochId, epoch.status);
        }

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(epoch.encryptedWinner);
        FHE.checkSignatures(handles, abiEncodedWinner, decryptionProof);

        address winner = abi.decode(abiEncodedWinner, (address));
        epoch.finalizedWinner = winner;
        if (winner == address(0)) {
            epoch.status = EpochStatus.NoWinner;
            emit NoWinnerFinalized(epochId);
            return;
        }

        epoch.status = EpochStatus.Finalized;
        FHE.allow(epoch.encryptedPrize, winner);
        emit WinnerFinalized(epochId, winner);
    }

    function status(uint64 epochId) external view returns (EpochStatus) {
        return _epochs[epochId].status;
    }

    function finalizedWinner(uint64 epochId) external view returns (address) {
        return _epochs[epochId].finalizedWinner;
    }

    function encryptedWinner(uint64 epochId) external view returns (eaddress) {
        return _epochs[epochId].encryptedWinner;
    }

    function encryptedPrize(uint64 epochId) external view returns (euint64) {
        return _epochs[epochId].encryptedPrize;
    }

    function isPrizeAllowed(uint64 epochId, address account) external view returns (bool) {
        Epoch storage epoch = _epochs[epochId];
        if (epoch.status == EpochStatus.Unset) return false;
        return FHE.isAllowed(epoch.encryptedPrize, account);
    }

    function isWinnerPubliclyDecryptable(uint64 epochId) external view returns (bool) {
        Epoch storage epoch = _epochs[epochId];
        if (epoch.status == EpochStatus.Unset) return false;
        return FHE.isPubliclyDecryptable(epoch.encryptedWinner);
    }

    function isPrizePubliclyDecryptable(uint64 epochId) external view returns (bool) {
        Epoch storage epoch = _epochs[epochId];
        if (epoch.status == EpochStatus.Unset) return false;
        return FHE.isPubliclyDecryptable(epoch.encryptedPrize);
    }
}
