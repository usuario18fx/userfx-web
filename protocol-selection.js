const STEP_SELECTOR = ".vx-step";

function prepareSteps(root = document) {
  root.querySelectorAll?.(STEP_SELECTOR).forEach((step) => {
    if (!(step instanceof HTMLElement)) return;
    if (step.dataset.userfxSelectableStep === "1") return;

    step.dataset.userfxSelectableStep = "1";
    step.tabIndex = 0;
    step.setAttribute("role", "button");
    step.setAttribute("aria-pressed", step.classList.contains("is-selected") ? "true" : "false");
  });
}

function selectStep(step) {
  if (!(step instanceof HTMLElement)) return;

  document.querySelectorAll(STEP_SELECTOR).forEach((item) => {
    if (!(item instanceof HTMLElement)) return;

    const selected = item === step;
    item.classList.toggle("is-selected", selected);
    item.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const step = target.closest(STEP_SELECTOR);
  if (step) selectStep(step);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;

  const target = event.target;
  if (!(target instanceof Element)) return;

  const step = target.closest(STEP_SELECTOR);
  if (!step) return;

  event.preventDefault();
  selectStep(step);
});

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;

      if (node.matches(STEP_SELECTOR)) {
        prepareSteps(node.parentElement || document);
      } else if (node.querySelector(STEP_SELECTOR)) {
        prepareSteps(node);
      }
    }
  }
});

function initProtocolSelection() {
  prepareSteps();
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProtocolSelection, { once: true });
} else {
  initProtocolSelection();
}
