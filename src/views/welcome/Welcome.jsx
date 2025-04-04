import React, { useEffect, useState } from "react";

const Welcome = ({ onStart, userData, onJournalClick }) => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // 根据屏幕宽度计算卡片位置
  const getCardTransform = (index) => {
    const isMobile = windowWidth <= 768;
    const isSmallMobile = windowWidth <= 480;
    const isTinyMobile = windowWidth <= 360;

    let translateX = (index - 1) * 160;
    let rotate = (index - 1) * 5;

    if (isTinyMobile) {
      translateX = (index - 1) * 120;
      rotate = (index - 1) * 3;
    } else if (isSmallMobile) {
      translateX = (index - 1) * 140;
      rotate = (index - 1) * 4;
    } else if (isMobile) {
      translateX = (index - 1) * 160;
      rotate = (index - 1) * 5;
    }

    return `translateX(${translateX}px) rotate(${rotate}deg)`;
  };

  return (
    <div className="welcome-container">
      <div className="main-content">
        <div className="large-text">
          <span className="text-part">
            長期資助海外藝術青年
            {userData?.idolName && (
              <span className="idol-name">{userData.idolName}</span>
            )}
          </span>
          <span className="text-part">成果發表計畫</span>
        </div>

        <div className="photo-cards">
          {userData?.photos ? (
            userData.photos.map((photo, index) => (
              <div
                key={index}
                className="card"
                style={{
                  transform: getCardTransform(index),
                  zIndex: index,
                }}
              >
                <img src={photo} alt={`照片 ${index + 1}`} />
              </div>
            ))
          ) : (
            <div className="empty-cards">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="card empty"
                  style={{
                    transform: getCardTransform(index),
                    zIndex: index,
                  }}
                >
                  <div className="card-placeholder">?</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="action-button">
          {!userData?.idolName ? (
            <button className="start-button" onClick={onStart}>
              設定偶像資料
            </button>
          ) : (
            userData.photos?.length >= 3 && (
              <button className="journal-button" onClick={onJournalClick}>
                進入追星日誌
              </button>
            )
          )}
        </div>
        <div className="footer">
          <div className="morse-code">
            {[
              "-",
              "..",
              "-.",
              "--.",
              "-",
              "..-",
              ".-",
              "-.",
              "..",
              ".",
              "--...",
              "....",
              "---",
              "-.",
              "--.",
              "..",
              "..",
              ".-",
              "-.",
            ].map((code, index) => (
              <React.Fragment key={index}>
                {code.split("").map((char, charIndex) => (
                  <span
                    key={`${index}-${charIndex}`}
                    className={char === "." ? "morse-dot" : "morse-dash"}
                  >
                    {char}
                  </span>
                ))}
                <span className="morse-space" />
              </React.Fragment>
            ))}
          </div>
          <div className="author">@LEFTLEFT10</div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
