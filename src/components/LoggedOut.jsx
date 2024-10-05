import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import illustration from "../assets/chop.jpg"

export default function LoggedOut() {
  const { login, register } = useKindeAuth();
  return (
    <>
      <header>
        <nav className="nav container">
          <h1 className="text-display-3" style={{ color: "#000000" }}>SensAI</h1>
          <div>
            <button
              className="btn btn-ghost sign-in-btn"
              onClick={login}
              style={{
                color: "#cc0000", // Blue for the text
                borderColor: "#cc0000", // Blue for border
              }}
            >
              Sign in
            </button>
            <button
              className="btn btn-dark"
              onClick={register}
              style={{
                backgroundColor: "#cc0000", // Blue background for sign-up button
                color: "#ffffff", // White text for contrast
              }}
            >
              Sign up
            </button>
          </div>
        </nav>
      </header>

      <main>
        <div className="container">
        <div
        className="card hero"
        style={{
          backgroundColor: "transparent", // Remove any background color
          boxShadow: "none", // Remove any shadow that might appear as a box
          border: "none" // Remove any border
      }}
    >
      <p className="text-display-1 hero-title" style={{ color: "#000000" }}>
        Let SensAI guide <br /> you in the right direction
      </p>

      <a
        href="https://kinde.com/docs/developer-tools/react-sdk"
        target="_blank"
        rel="noreferrer"
        className="btn btn-light btn-big"
        style={{
          backgroundColor: "#cc0000", // Lighter blue for buttons
          color: "#ffffff", // White text
        }}
      >
        Let SensAI guide you now
      </a>
    </div>
</div>

      </main>

      <footer className="footer" style={{ backgroundColor: "#cc0000" }}>
        <div className="container">
          <strong className="text-heading-2" style={{ color: "#ffffff" }}>
            SensAI
          </strong>
          <p className="footer-tagline text-body-3" style={{ color: "#ffffff" }}>
            Visit our{" "}
            <a className="link" href="https://kinde.com/docs" style={{ color: "#80b3ff" }}>
              help center
            </a>
          </p>

          <small className="text-subtle" style={{ color: "#e6e6e6" }}>
            © 2023 KindeAuth, Inc. All rights reserved
          </small>
        </div>
      </footer>
    </>
  );
}


