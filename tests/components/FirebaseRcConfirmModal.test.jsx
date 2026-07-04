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

const RULES = [
  {
    key: "paywall_variant",
    target: "default",
    valueType: "STRING",
    submitValue: "reviewer",
    releaseValue: "user",
    description: "Paywall A/B variant",
  },
  {
    key: "min_version",
    target: "default",
    valueType: "STRING",
    submitValue: "{{versionString}}",
    releaseValue: "{{versionString}}",
    description: null,
  },
];

function renderModal(overrides = {}) {
  const props = {
    configured: false,
    changes: [],
    noChanges: true,
    projectId: null,
    rules: [],
    previewUnavailable: false,
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
    renderModal({
      configured: true,
      changes: CHANGES,
      noChanges: false,
      projectId: "test-project",
      rules: RULES,
    });
    expect(screen.getByText("Remote Config Preview")).toBeInTheDocument();
    expect(screen.getAllByText("paywall_variant").length).toBeGreaterThan(0);
    expect(screen.getAllByText("reviewer").length).toBeGreaterThan(0);
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

  it("renders configured rules and highlights the submit value in submit mode", () => {
    renderModal({
      configured: true,
      changes: [],
      noChanges: true,
      rules: RULES,
      mode: "submit",
      versionString: "1.2.0",
    });
    expect(screen.getByText("Configured Rules")).toBeInTheDocument();
    // submit value highlighted for paywall_variant
    expect(screen.getByText("Paywall A/B variant")).toBeInTheDocument();
    // submitValue "reviewer" appears (in rules table)
    expect(screen.getAllByText("reviewer").length).toBeGreaterThan(0);
  });

  it("resolves {{versionString}} placeholder in rule values", () => {
    renderModal({
      configured: true,
      changes: [],
      noChanges: true,
      rules: RULES,
      mode: "release",
      versionString: "1.2.0",
    });
    // resolved value 1.2.0 should appear in the rules table
    expect(screen.getByText("1.2.0")).toBeInTheDocument();
    // raw template shown in parentheses
    expect(screen.getByText("({{versionString}})")).toBeInTheDocument();
  });

  it("shows live preview unavailable note when previewUnavailable is true", () => {
    renderModal({
      configured: true,
      changes: [],
      noChanges: true,
      rules: RULES,
      previewUnavailable: true,
      mode: "submit",
    });
    expect(
      screen.getByText("Live preview unavailable — rules will still apply on confirm.")
    ).toBeInTheDocument();
  });
});
