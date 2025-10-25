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
        
        // 為新用戶創建用戶文檔
        await createUserDocument(userCredential.user);
      }

      onAuthSuccess(userCredential.user);
    } catch (error) {
      console.error("認證失敗:", error);
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
      
      // 檢查是否為新用戶，如果是則創建用戶文檔
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (!userDoc.exists()) {
        await createUserDocument(userCredential.user);
      }

      onAuthSuccess(userCredential.user);
    } catch (error) {
      console.error("Google 登入失敗:", error);
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
        return "找不到此用戶";
      case "auth/wrong-password":
        return "密碼錯誤";
      case "auth/email-already-in-use":
        return "此電子郵件已被使用";
      case "auth/weak-password":
        return "密碼過於簡單";
      case "auth/invalid-email":
        return "無效的電子郵件格式";
      default:
        return "認證失敗，請稍後再試";
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-content">
        <div className="auth-header">
          <h1 className="auth-title">
            {isLogin ? "登入" : "註冊"}
          </h1>
          <p className="auth-subtitle">
            {isLogin ? "歡迎回來！" : "開始你的追星記帳之旅"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">電子郵件</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="請輸入電子郵件"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密碼</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入密碼"
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
            {loading ? "處理中..." : (isLogin ? "登入" : "註冊")}
          </button>

          <div className="auth-divider">
            <span>或</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="auth-button google"
            disabled={loading}
          >
            <span>使用 Google {isLogin ? "登入" : "註冊"}</span>
          </button>

          <div className="auth-switch">
            <p>
              {isLogin ? "還沒有帳號？" : "已經有帳號了？"}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="auth-switch-button"
                disabled={loading}
              >
                {isLogin ? "立即註冊" : "立即登入"}
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;