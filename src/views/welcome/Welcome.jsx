import React from "react";

const Welcome = ({ onStart, userData, onJournalClick }) => {
  console.log(userData);
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
          {/* <br /> */}
          <span className="text-part">成果發表計畫</span>
        </div>

        <div className="photo-cards">
          {userData?.photos ? (
            userData.photos.map((photo, index) => (
              <div
                key={index}
                className="card"
                style={{
                  transform: `translateX(${(index - 1) * 160}px) rotate(${
                    (index - 1) * 5
                  }deg)`,
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
                    transform: `translateX(${(index - 1) * 160}px) rotate(${
                      (index - 1) * 5
                    }deg)`,
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
