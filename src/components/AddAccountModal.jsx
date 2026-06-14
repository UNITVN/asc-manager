import { useState } from "react";
import { ACCT_COLORS } from "../constants/index.js";

export default function AddAccountModal({ onClose, onAdd, isMobile }) {
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [keyId, setKeyId] = useState("");
  const [pk, setPk] = useState("");
  const [vendorNumber, setVendorNumberInput] = useState("");

  const disabled = !name || !issuer || !keyId;

  const labelCls = "text-[11px] uppercase tracking-wide font-semibold text-dark-dim mb-1.5 block";
  const inputCls = `w-full pl-10 pr-3.5 py-3 bg-dark-surface border border-dark-border-light rounded-lg text-dark-text outline-none font-sans transition-colors ${isMobile ? "text-base" : "text-[13px]"}`;
  const helperCls = "text-[11px] text-dark-phantom mt-1.5";

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 bg-black/40 backdrop-blur-[8px] flex justify-center z-[100] ${isMobile ? "items-end" : "items-center"}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "asc-fadein 0.3s ease" }}
        className={`bg-dark-card border border-dark-border-light w-full overflow-y-auto shadow-[0_32px_64px_rgba(0,0,0,0.15)] ${
          isMobile
            ? "rounded-t-2xl max-w-full max-h-[90vh]"
            : "rounded-2xl max-w-[540px]"
        }`}
      >
        {/* Header */}
        <div className="px-8 py-5 border-b border-dark-border flex items-center justify-between sticky top-0 bg-dark-card z-[1]">
          <div className="flex items-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span className="text-base font-bold">Connect Account</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-dark-surface flex items-center justify-center cursor-pointer border-none hover:bg-dark-hover transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#86868b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className={isMobile ? "px-5 py-5" : "px-8 py-6"}>
          {/* Info Callout */}
          <div className="flex items-start gap-3 bg-accent-bg border border-accent-border rounded-lg px-4 py-3.5 mb-6">
            <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p className="text-[12.5px] text-dark-muted leading-relaxed">
              Connect via App Store Connect API. Generate keys at{" "}
              <span className="text-accent-light font-medium">
                Users and Access {"\u2192"} Integrations {"\u2192"} App Store Connect API
              </span>.
            </p>
          </div>

          {/* Section 1: Account Information */}
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-6 h-6 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
              <span className="text-[13px] font-semibold text-dark-text">Account Information</span>
            </div>
            <div>
              <label className={labelCls}>Account Name</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  className={`${inputCls} font-sans`}
                  placeholder="e.g. My Company LLC"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <p className={helperCls}>Display name for this account in the dashboard</p>
            </div>
          </div>

          {/* Section 2: API Credentials */}
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-6 h-6 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
              <span className="text-[13px] font-semibold text-dark-text">API Credentials</span>
            </div>
            <div className="space-y-4">
              {/* Issuer ID */}
              <div>
                <label className={labelCls}>Issuer ID</label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    className={`${inputCls} font-mono`}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                  />
                </div>
                <p className={helperCls}>Found in Users and Access under the API Keys section</p>
              </div>
              {/* Key ID */}
              <div>
                <label className={labelCls}>Key ID</label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                  </svg>
                  <input
                    className={`${inputCls} font-mono`}
                    placeholder="XXXXXXXXXX"
                    value={keyId}
                    onChange={(e) => setKeyId(e.target.value)}
                  />
                </div>
                <p className={helperCls}>The 10-character identifier for your API key</p>
              </div>
              {/* Private Key */}
              <div>
                <label className={labelCls}>Private Key (.p8)</label>
                <textarea
                  className={`w-full px-3.5 py-3 bg-dark-surface border border-dark-border-light rounded-lg text-dark-text outline-none font-mono transition-colors h-[100px] resize-y ${isMobile ? "text-base" : "text-xs"}`}
                  placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
                  value={pk}
                  onChange={(e) => setPk(e.target.value)}
                />
                <p className={helperCls}>Paste the full contents of the .p8 file downloaded from App Store Connect</p>
              </div>
            </div>
          </div>

          {/* Section 3: Sales reporting (optional) */}
          <div className="mb-2">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-6 h-6 rounded-full bg-dark-hover text-dark-dim text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
              <span className="text-[13px] font-semibold text-dark-text">Sales Reporting (optional)</span>
            </div>
            <div>
              <label className={labelCls}>Vendor Number</label>
              <input
                className={`w-full px-3.5 py-3 bg-dark-surface border border-dark-border-light rounded-lg text-dark-text outline-none font-mono transition-colors ${isMobile ? "text-base" : "text-[13px]"}`}
                placeholder="e.g. 81234567"
                value={vendorNumber}
                onChange={(e) => setVendorNumberInput(e.target.value)}
              />
              <p className={helperCls}>
                Required for download stats. Find it in App Store Connect under Payments and Financial Reports (vendorNumber in the URL).
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-8 py-4 border-t border-dark-border flex gap-2.5 ${isMobile ? "flex-col-reverse" : "justify-end"}`}>
          <button
            onClick={onClose}
            className="px-[18px] py-3 rounded-lg text-[13px] font-semibold bg-dark-surface text-dark-label border border-dark-border-light cursor-pointer font-sans hover:bg-dark-hover transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={disabled}
            onClick={() => {
              onAdd({
                id: Date.now().toString(),
                name,
                issuer,
                keyId,
                pk,
                vendorNumber,
                color: ACCT_COLORS[Math.floor(Math.random() * ACCT_COLORS.length)],
              });
              onClose();
            }}
            className={`px-[18px] py-3 rounded-lg text-[13px] font-semibold bg-accent text-white border-none font-sans transition-all ${
              disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:brightness-110"
            }`}
          >
            Connect Account
          </button>
        </div>
      </div>
    </div>
  );
}
