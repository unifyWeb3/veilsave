import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { lazy, Suspense } from "react";

import { LandingPage } from "./components/LandingPage";
import { Button, PrivacyCallout, SectionHead, StateBlock, Wordmark } from "./design/Primitives";

const ConsoleApp = lazy(() =>
  import("./components/ConsoleApp").then((module) => ({ default: module.ConsoleApp })),
);
const ZamaProvider = lazy(() =>
  import("./providers/ZamaProvider").then((module) => ({ default: module.ZamaProvider })),
);

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacy" element={<PublicPrivacy />} />
      <Route
        path="/app/*"
        element={
          <Suspense fallback={<ConsoleLoading />}>
            <ZamaProvider>
              <ConsoleApp />
            </ZamaProvider>
          </Suspense>
        }
      />
      <Route path="/draws" element={<Navigate to="/app/draws/current" replace />} />
      <Route path="/draws/:epochId" element={<LegacyDrawRedirect />} />
      <Route path="/history" element={<Navigate to="/app/history" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function LegacyDrawRedirect() {
  const { epochId } = useParams();
  return <Navigate to={`/app/draws/${epochId ?? "current"}`} replace />;
}

function PublicPrivacy() {
  const navigate = useNavigate();
  return (
    <div className="landing">
      <header className="public-header">
        <NavLink to="/" aria-label="VeilSave home">
          <Wordmark size={19} />
        </NavLink>
        <Button iconAfter="arrow-right" onClick={() => navigate("/app")}>
          Open console
        </Button>
      </header>
      <main className="landing-band">
        <SectionHead
          label="Trust and boundaries"
          title="Privacy with a public audit trail"
          description="VeilSave keeps financial values encrypted without claiming anonymous addresses or invisible transactions."
        />
        <PrivacyCallout />
        <div className="landing-facts">
          <div className="landing-fact">
            <strong>Guaranteed confidentiality</strong>
            <span>
              Principal, eligible and pending weight, withdrawal claims, encrypted reserve, draw
              intermediates, and prize amount.
            </span>
          </div>
          <div className="landing-fact">
            <strong>Public metadata</strong>
            <span>
              Wallet and contract addresses, transaction existence and timing, slot occupancy, epoch
              state, VRF evidence, aggregate settlement, and finalized winner.
            </span>
          </div>
          <div className="landing-fact">
            <strong>Browser boundary</strong>
            <span>
              A compromised browser or wallet can access values the user explicitly reveals. Reveals
              are manual, scoped, and kept in session memory.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

function ConsoleLoading() {
  return (
    <main className="gate">
      <StateBlock kind="loading" title="Loading the VeilSave console">
        Public marketing content stays lightweight; transaction and confidential-value modules load
        only when the console is opened.
      </StateBlock>
    </main>
  );
}
