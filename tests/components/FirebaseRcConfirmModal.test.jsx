import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FirebaseRcConfirmModal from "../../src/components/FirebaseRcConfirmModal.jsx";

const CHANGES = [
  {
    key: "paywall_variant",
    target: "default",
    currentValue: "user",
    resolvedValue: "reviewer",
  },
];

function renderModal(overrides = {}) {
  const props = {
    configured: false,
    changes: [],
    noChanges: true,
    projectId: null,
    versionString: "1.2.0",
    platform: "IOS",
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    processing: false,
    error: null,
    isMobile: false,
    mode: "release",
    isResubmit: false,
    ...overrides,
  };
  render(<FirebaseRcConfirmModal {...props} />);
  return props;
}

describe("FirebaseRcConfirmModal", () => {
  it("shows simple confirm when not configured", () => {
    renderModal({ mode: "submit" });
    expect(screen.getByText("Submit for Review")).toBeInTheDocument();
    expect(screen.getByText(/Submit iOS version 1\.2\.0 for App Review\?/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm Submit" })).not.toBeDisabled();
  });

  it("shows RC diff table when configured with changes", () => {
    renderModal({ configured: true, changes: CHANGES, noChanges: false, projectId: "test-project" });
    expect(screen.getByText("Remote Config Preview")).toBeInTheDocument();
    expect(screen.getByText("paywall_variant")).toBeInTheDocument();
    expect(screen.getByText("reviewer")).toBeInTheDocument();
    expect(screen.getByText(/Remote Config will be updated before releasing/)).toBeInTheDocument();
  });

  it("calls onConfirm when confirm is clicked", async () => {
    const user = userEvent.setup();
    const props = renderModal({ mode: "release" });
    await user.click(screen.getByRole("button", { name: "Confirm Release" }));
    expect(props.onConfirm).toHaveBeenCalled();
  });

  it("shows resubmit copy when isResubmit is true", () => {
    renderModal({ mode: "submit", isResubmit: true });
    expect(screen.getByRole("button", { name: "Confirm Resubmit" })).toBeInTheDocument();
  });
});
