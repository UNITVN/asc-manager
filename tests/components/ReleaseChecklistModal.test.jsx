import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReleaseChecklistModal from "../../src/components/ReleaseChecklistModal.jsx";

const ITEMS = [
  { id: "item-1", label: "Verify screenshots", description: null },
  { id: "item-2", label: "Check release notes", description: null },
];

function renderModal(overrides = {}) {
  const props = {
    items: [],
    versionString: "1.2.0",
    platform: "IOS",
    checkedIds: new Set(),
    onToggleItem: vi.fn(),
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    processing: false,
    error: null,
    isMobile: false,
    mode: "release",
    isResubmit: false,
    ...overrides,
  };
  render(<ReleaseChecklistModal {...props} />);
  return props;
}

describe("ReleaseChecklistModal", () => {
  it("disables confirm until all checklist items are checked", async () => {
    const user = userEvent.setup();
    const checkedIds = new Set();
    const onToggleItem = vi.fn((id) => checkedIds.add(id));

    const { rerender } = render(
      <ReleaseChecklistModal
        items={ITEMS}
        versionString="1.2.0"
        platform="IOS"
        checkedIds={checkedIds}
        onToggleItem={onToggleItem}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isMobile={false}
        mode="release"
      />
    );

    const confirm = screen.getByRole("button", { name: "Confirm Release" });
    expect(confirm).toBeDisabled();

    checkedIds.add("item-1");
    rerender(
      <ReleaseChecklistModal
        items={ITEMS}
        versionString="1.2.0"
        platform="IOS"
        checkedIds={checkedIds}
        onToggleItem={onToggleItem}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isMobile={false}
        mode="release"
      />
    );
    expect(confirm).toBeDisabled();

    checkedIds.add("item-2");
    rerender(
      <ReleaseChecklistModal
        items={ITEMS}
        versionString="1.2.0"
        platform="IOS"
        checkedIds={checkedIds}
        onToggleItem={onToggleItem}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isMobile={false}
        mode="release"
      />
    );
    expect(confirm).not.toBeDisabled();

    await user.click(confirm);
  });

  it("shows submit-specific copy in submit mode", () => {
    renderModal({ mode: "submit" });
    expect(screen.getByText("Submit for Review")).toBeInTheDocument();
    expect(screen.getByText(/Submit iOS version 1\.2\.0 for App Review\?/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm Submit" })).toBeInTheDocument();
  });

  it("shows resubmit copy when isResubmit is true", () => {
    renderModal({ mode: "submit", isResubmit: true });
    expect(screen.getByRole("button", { name: "Confirm Resubmit" })).toBeInTheDocument();
  });

  it("shows release-specific copy in release mode", () => {
    renderModal({ mode: "release" });
    expect(screen.getByText("Release Version")).toBeInTheDocument();
    expect(screen.getByText(/Release iOS version 1\.2\.0 to the App Store\?/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm Release" })).toBeInTheDocument();
  });
});