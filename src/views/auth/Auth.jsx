import React, { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider 
} from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

const Auth = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let userCredential;
      
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create user document for new user
        await createUserDocument(userCredential.user);
      }

      onAuthSuccess(userCredential.user);
    } catch (error) {
      console.error("Authentication failed:", error);
      setError(getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      // Check if new user, if so create user document
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (!userDoc.exists()) {
        await createUserDocument(userCredential.user);
      }

      onAuthSuccess(userCredential.user);
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setError(getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const createUserDocument = async (user) => {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName || "",
      createdAt: new Date(),
      updatedAt: new Date()
    });
  };

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "auth/user-not-found":
        return "User not found";
      case "auth/wrong-password":
        return "Incorrect password";
      case "auth/email-already-in-use":
        return "Email already in use";
      case "auth/weak-password":
        return "Password is too weak";
      case "auth/invalid-email":
        return "Invalid email format";
      default:
        return "Authentication failed, please try again later";
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-content">
        <div className="auth-header">
          <h1 className="auth-title">
            {isLogin ? "Sign In" : "Sign Up"}
          </h1>
          <p className="auth-subtitle">
            {isLogin ? "Welcome back!" : "Begin your artist patronage journey"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              minLength="6"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-button primary"
            disabled={loading}
          >
            {loading ? "Processing..." : (isLogin ? "Sign In" : "Sign Up")}
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="auth-button google"
            disabled={loading}
          >
            <span>{isLogin ? "Sign in with Google" : "Sign up with Google"}</span>
          </button>

          <div className="auth-switch">
            <p>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="auth-switch-button"
                disabled={loading}
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;