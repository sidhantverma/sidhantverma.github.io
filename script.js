const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menuToggle.setAttribute("aria-label", isExpanded ? "Open navigation menu" : "Close navigation menu");
  navLinks.classList.toggle("is-open", !isExpanded);
});

navLinks.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
    navLinks.classList.remove("is-open");
  }
});

document.querySelector("#year").textContent = new Date().getFullYear();

const careerStart = new Date(2014, 3, 1);
const today = new Date();
let experienceYears = today.getFullYear() - careerStart.getFullYear();

if (
  today.getMonth() < careerStart.getMonth() ||
  (today.getMonth() === careerStart.getMonth() && today.getDate() < careerStart.getDate())
) {
  experienceYears -= 1;
}

document.querySelector("#experience-years").textContent = `${experienceYears}+ years`;

const certificateDialog = document.querySelector(".certificate-dialog");
const certificateFrame = document.querySelector(".certificate-frame");
const certificateTitle = document.querySelector("#certificate-dialog-title");

document.querySelectorAll(".certificate-viewer").forEach((button) => {
  button.addEventListener("click", () => {
    const file = button.dataset.file;
    const title = button.dataset.title;

    if (!file || !title) {
      throw new Error("Certificate preview is missing its title or file.");
    }

    if (window.matchMedia("(max-width: 700px)").matches) {
      window.location.assign(file);
      return;
    }

    certificateTitle.textContent = title;
    certificateFrame.src = `${file}#toolbar=0&navpanes=0`;
    certificateDialog.showModal();
  });
});

document.querySelector(".certificate-dialog-close").addEventListener("click", () => {
  certificateDialog.close();
});

certificateDialog.addEventListener("close", () => {
  certificateFrame.src = "about:blank";
});
