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
          <div className="artistic-title-main">
            <span className="main-letter main-letter-1">L</span>
            <span className="main-letter main-letter-2">o</span>
            <span className="main-letter main-letter-3">n</span>
            <span className="main-letter main-letter-4">g</span>
            <span className="main-letter main-letter-5">-</span>
            <span className="main-letter main-letter-6">t</span>
            <span className="main-letter main-letter-7">e</span>
            <span className="main-letter main-letter-8">r</span>
            <span className="main-letter main-letter-9">m</span>
          </div>
          <div className="artistic-title-sub">
            <span className="sub-letter sub-letter-1">S</span>
            <span className="sub-letter sub-letter-2">u</span>
            <span className="sub-letter sub-letter-3">p</span>
            <span className="sub-letter sub-letter-4">p</span>
            <span className="sub-letter sub-letter-5">o</span>
            <span className="sub-letter sub-letter-6">r</span>
            <span className="sub-letter sub-letter-7">t</span>
            <span className="sub-letter sub-letter-8">J</span>
            <span className="sub-letter sub-letter-9">o</span>
            <span className="sub-letter sub-letter-10">u</span>
            <span className="sub-letter sub-letter-11">r</span>
            <span className="sub-letter sub-letter-12">n</span>
            <span className="sub-letter sub-letter-13">a</span>
            <span className="sub-letter sub-letter-14">l</span>
          </div>
          {userData?.idolName && (
            <div className="idol-name-main">{userData.idolName}</div>
          )}
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = `${getCardTransform(index)} translateY(-10px)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = getCardTransform(index);
                }}
              >
                <img src={photo} alt={`照片 ${index + 1}`} />
              </div>
            ))
          ) : (
            <>
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
            </>
          )}
        </div>

        <div className="action-button">
          {!userData?.idolName ? (
            <button className="start-button" onClick={onStart}>
              Setup Profile
            </button>
          ) : (
            <button className="journal-button" onClick={onJournalClick}>
              Enter Journal
            </button>
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
