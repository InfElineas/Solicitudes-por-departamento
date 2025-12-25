import React from "react";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import RequestsView from "./RequestsView";

// React 18 concurrent act signal for jest/dom environment
global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("./RequestFilters", () => () => <div data-testid="filters" />);

jest.mock("./RequestCard", () => ({ request }) => (
  <div data-testid="request-card">{request.title}</div>
));

jest.mock("./CreateRequestDialog", () => () => (
  <div data-testid="create-request-dialog" />
));
jest.mock("./RequestDetailDialog", () => () => null);
jest.mock("./EditRequestDialog", () => () => null);

jest.mock("@/api/client", () => ({
  put: jest.fn(),
}));

const baseProps = {
  user: {},
  users: [],
  filters: {},
  setFilters: jest.fn(),
  departments: [],
  setRequestDialog: jest.fn(),
  requestDialog: false,
  newRequest: {},
  setNewRequest: jest.fn(),
  createRequest: jest.fn(),
  deleteRequest: jest.fn(),
  setClassifyDialogFor: jest.fn(),
  setClassifyData: jest.fn(),
  setAssignDialogFor: jest.fn(),
  setAssignData: jest.fn(),
  setFeedbackDialogFor: jest.fn(),
  setFeedbackData: jest.fn(),
  takeRequest: jest.fn(),
  rejectRequest: jest.fn(),
  sendToReview: jest.fn(),
  backToProgress: jest.fn(),
  finishRequest: jest.fn(),
  requests: [{ id: 1, title: "Primera" }],
  fetchRequests: jest.fn(),
};

const Wrapper = React.forwardRef((props, ref) => {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);
  const total = 12;
  const totalPages = 3;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  React.useImperativeHandle(ref, () => ({ page, setPage, setPageSize }));

  return (
    <RequestsView
      {...baseProps}
      {...props}
      page={page}
      setPage={setPage}
      pageSize={pageSize}
      setPageSize={setPageSize}
      pageInfo={{ from, to }}
      total={total}
      totalPages={totalPages}
    />
  );
});

const getTextCount = (container, text) =>
  Array.from(container.querySelectorAll("*")).filter(
    (el) => el.textContent.trim() === text,
  ).length;

const getButtonsByLabel = (container, text) =>
  Array.from(container.querySelectorAll("button")).filter((btn) =>
    btn.textContent.includes(text),
  );

describe("RequestsView pagination", () => {
  let container;
  let root;
  let ref;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    ref = React.createRef();
    act(() => {
      root = createRoot(container);
      root.render(<Wrapper ref={ref} />);
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    container = null;
  });

  test("renders synced pagination at top and bottom", () => {
    expect(getTextCount(container, "Página 1 / 3")).toBe(2);
    expect(getTextCount(container, "Mostrando 1–5 de 12")).toBe(2);
  });

  test("changes page from top pagination and updates both controls", () => {
    const nextButtons = getButtonsByLabel(container, "Siguiente");
    expect(nextButtons.length).toBeGreaterThanOrEqual(1);

    act(() => {
      nextButtons[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(getTextCount(container, "Página 2 / 3")).toBe(2);
    expect(getTextCount(container, "Mostrando 6–10 de 12")).toBe(2);
  });
});
