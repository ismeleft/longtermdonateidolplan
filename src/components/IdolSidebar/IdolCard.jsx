import React from "react";
import "./IdolSidebar.css";

const IdolCard = ({ idol, isActive, onClick, onDelete, startDate }) => {
  // 計算追星天數
  const calculateDays = () => {
    if (!startDate) return 0;
    const now = new Date();
    const start = new Date(startDate);
    const diffTime = Math.abs(now - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const days = calculateDays();
  const thumbnailPhoto = idol.photos?.[0]; // 使用第一張照片作為縮圖

  return (
    <div
      className={`idol-card ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      {/* 當前選中指示器 */}
      {isActive && <div className="active-indicator"></div>}

      {/* Idol 照片縮圖 */}
      <div className="idol-card-photo">
        {thumbnailPhoto ? (
          <img src={thumbnailPhoto} alt={idol.idolName} />
        ) : (
          <div className="idol-card-placeholder">
            {idol.idolName?.charAt(0)?.toUpperCase() || "?"}
          </div>
        )}
      </div>

      {/* Idol 資訊 */}
      <div className="idol-card-info">
        <div className="idol-card-name">{idol.idolName || "Unnamed"}</div>
        {startDate && (
          <div className="idol-card-days">{days} days</div>
        )}
      </div>

      {/* 刪除按鈕（hover 顯示） */}
      <button
        className={`idol-card-delete ${!onDelete ? "disabled" : ""}`}
        onClick={(e) => {
          e.stopPropagation(); // 防止觸發卡片點擊
          if (!onDelete) {
            alert("Cannot delete the only artist. At least one must remain.");
            return;
          }
          if (window.confirm(`Remove ${idol.idolName}? Support records will be preserved.`)) {
            onDelete(idol.id);
          }
        }}
        title={onDelete ? "Remove this artist" : "At least one artist required"}
        disabled={!onDelete}
      >
        ✕
      </button>
    </div>
  );
};

export default IdolCard;
