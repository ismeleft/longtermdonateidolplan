import React from "react";
import IdolCard from "./IdolCard";
import "./IdolSidebar.css";

const IdolSidebar = ({
  idolList = [],
  currentIdolId,
  onSwitchIdol,
  onAddNew,
  onDelete,
  isOpen = true,
  onClose,
}) => {
  // 每個 idol 都有各自的 startDate（在 idol 文件中）
  // 不需要額外的狀態管理

  return (
    <>
      {/* 側邊欄 */}
      <aside className={`idol-sidebar ${isOpen ? "open" : ""}`}>
        {/* 側邊欄頭部 */}
        <div className="sidebar-header">
          <h2 className="sidebar-title">My Artists</h2>
          {/* 手機版關閉按鈕 */}
          {onClose && (
            <button className="sidebar-close md:hidden" onClick={onClose}>
              ✕
            </button>
          )}
        </div>

        {/* Idol 列表 */}
        <div className="idol-list">
          {idolList.length === 0 ? (
            <div className="empty-idol-list">
              <p>No artists added yet</p>
              <p className="empty-hint">Click below to begin</p>
            </div>
          ) : (
            idolList.map((idol) => (
              <IdolCard
                key={idol.id}
                idol={idol}
                isActive={idol.id === currentIdolId}
                onClick={() => onSwitchIdol(idol.id)}
                onDelete={idolList.length > 1 ? onDelete : null} // 至少保留一個 idol
                startDate={idol.startDate} // 直接使用 idol 自己的 startDate
              />
            ))
          )}
        </div>

        {/* 新增 Idol 按鈕 */}
        <button className="add-idol-btn" onClick={onAddNew}>
          <span className="add-icon">+</span>
          <span>Add Artist</span>
        </button>

        {/* 側邊欄底部資訊 */}
        <div className="sidebar-footer">
          <div className="sidebar-version">v2.0</div>
        </div>
      </aside>

      {/* 手機版遮罩 */}
      {isOpen && onClose && (
        <div className="sidebar-overlay md:hidden" onClick={onClose}></div>
      )}
    </>
  );
};

export default IdolSidebar;
