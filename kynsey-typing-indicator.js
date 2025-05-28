class KynseyTypingIndicator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.visible = false;
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          left: 0; right: 0; bottom: 0;
          z-index: 9999;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }
        .indicator-container {
          background: rgba(30, 32, 38, 0.98);
          color: #fff;
          border-radius: 1.5em;
          box-shadow: 0 4px 24px 0 rgba(0,0,0,0.18);
          padding: 1.2em 2.2em 1.2em 1.2em;
          display: flex;
          align-items: center;
          gap: 1.2em;
          min-width: 320px;
          max-width: 90vw;
          margin: 2em 0;
          font-family: 'Segoe UI', 'Arial', sans-serif;
          pointer-events: auto;
          transition: opacity 0.3s;
          opacity: 0;
          visibility: hidden;
        }
        :host([active]) .indicator-container {
          opacity: 1;
          visibility: visible;
        }
        .avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          overflow: hidden;
          background: #23243a;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 0 #5eead4;
          animation: avatar-pulse 1.2s infinite;
        }
        @keyframes avatar-pulse {
          0% { box-shadow: 0 0 0 0 #5eead4; }
          70% { box-shadow: 0 0 0 12px rgba(94,234,212,0); }
          100% { box-shadow: 0 0 0 0 rgba(94,234,212,0); }
        }
        .message {
          font-size: 1.15em;
          font-weight: 500;
          letter-spacing: 0.01em;
          margin-bottom: 0.4em;
        }
        .progress-bar {
          width: 100%;
          height: 6px;
          background: #23243a;
          border-radius: 3px;
          overflow: hidden;
          margin-top: 0.2em;
        }
        .progress-inner {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #5eead4 0%, #38bdf8 100%);
          border-radius: 3px;
          animation: progress-move 2.2s cubic-bezier(.4,0,.2,1) infinite;
        }
        @keyframes progress-move {
          0% { width: 0%; }
          60% { width: 90%; }
          100% { width: 0%; }
        }
        .pulse-dots {
          display: flex;
          gap: 0.3em;
          align-items: center;
          margin-top: 0.2em;
        }
        .dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          background: #5eead4;
          opacity: 0.7;
          animation: dotPulse 1.2s infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.7; transform: scale(1);}
          40% { opacity: 1; transform: scale(1.3);}
        }
        @media (max-width: 600px) {
          .indicator-container { min-width: 0; padding: 1em; }
          .avatar { width: 40px; height: 40px; }
        }
      </style>
      <div class="indicator-container" role="status" aria-live="polite">
        <div class="avatar" aria-hidden="true">
          <img src="images/logo.svg" alt="KYNSEY AI Avatar" style="width:90%;height:90%;object-fit:contain;">
        </div>
        <div style="flex:1;min-width:0;">
          <div class="message" id="message">KYNSEY is thinking...</div>
          <div class="progress-bar"><div class="progress-inner"></div></div>
          <div class="pulse-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        </div>
      </div>
    `;
  }

  show(message = "KYNSEY is thinking...") {
    this.setAttribute('active', '');
    this.shadowRoot.getElementById('message').textContent = message;
  }

  hide() {
    this.removeAttribute('active');
  }
}

customElements.define('kynsey-typing-indicator', KynseyTypingIndicator);