import React, { useState } from "react";
import { db } from "../../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

const IdolSetup = ({ onSetupComplete }) => {
  const [idolData, setIdolData] = useState({
    name: "",
    debutDate: "",
    description: "",
  });
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 處理照片預覽和存儲
  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 3) {
      setError("最多只能上傳3張照片");
      return;
    }

    // 讀取並轉換文件為 base64
    Promise.all(
      files.map((file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      })
    )
      .then((base64Photos) => {
        setPhotos(base64Photos);
      })
      .catch((error) => {
        console.error("照片處理失敗:", error);
        setError("照片處理失敗，檔案過大，請重新上傳");
      });
  };

  // 保存偶像數據
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 驗證
      if (!idolData.name || !idolData.debutDate) {
        throw new Error("請填寫必要信息");
      }

      if (photos.length === 0) {
        throw new Error("請至少上傳一張照片");
      }

      // 保存偶像數據到 Firestore
      const idolDoc = await addDoc(collection(db, "idols"), {
        ...idolData,
        debutDate: Timestamp.fromDate(new Date(idolData.debutDate)),
        createdAt: Timestamp.now(),
      });

      // 保存照片到 localStorage
      localStorage.setItem(`idol_photos_${idolDoc.id}`, JSON.stringify(photos));

      // 完成設置
      onSetupComplete(idolDoc.id);
    } catch (error) {
      console.error("保存偶像數據失敗:", error);
      setError(error.message || "保存失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-form">
      <h2 className="setup-title">設置偶像資料</h2>
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>偶像名稱</label>
          <input
            type="text"
            value={idolData.name}
            onChange={(e) => setIdolData({ ...idolData, name: e.target.value })}
            placeholder="請輸入偶像名稱"
            className="setup-input"
            required
          />
        </div>

        <div className="form-group">
          <label>出道日期</label>
          <input
            type="date"
            value={idolData.debutDate}
            onChange={(e) =>
              setIdolData({ ...idolData, debutDate: e.target.value })
            }
            className="setup-input"
            required
          />
        </div>

        <div className="form-group">
          <label>簡介</label>
          <textarea
            value={idolData.description}
            onChange={(e) =>
              setIdolData({ ...idolData, description: e.target.value })
            }
            placeholder="請輸入偶像簡介"
            className="setup-input"
            rows="3"
          />
        </div>

        <div className="photo-upload">
          <label>上傳照片（最多3張）</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoChange}
            className="file-input"
            id="photo-input"
          />
          <label htmlFor="photo-input" className="upload-button">
            選擇照片
          </label>

          <div className="photo-preview">
            {photos.map((base64, index) => (
              <div key={index} className="preview-card has-image">
                <img src={base64} alt={`預覽 ${index + 1}`} />
              </div>
            ))}
            {[...Array(3 - photos.length)].map((_, index) => (
              <div key={`empty-${index}`} className="preview-card">
                <div className="placeholder">+</div>
              </div>
            ))}
          </div>
          <p className="upload-hint">點擊卡片上傳照片，建議尺寸 3:4</p>
        </div>

        <button type="submit" className="setup-button" disabled={loading}>
          {loading ? "保存中..." : "完成設置"}
        </button>
      </form>
    </div>
  );
};

export default IdolSetup;
