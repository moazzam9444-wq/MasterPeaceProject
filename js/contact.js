// Feedback stays local until a backend is connected. Email opens a real draft.
{
  const form = document.getElementById("feedbackForm");
  const status = document.getElementById("feedbackStatus");
  const emailLink = document.getElementById("emailFeedback");
  const account = KicksAuth.current();
  if (account) {
    form.elements.name.value = account.name;
    form.elements.email.value = account.email;
  }
  form.addEventListener("input", () => { status.textContent = ""; emailLink.hidden = true; });
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    try {
      const details = {};
      for (const [name, value] of new FormData(form)) {
        details[name] = value;
      }
      const saved = KicksStore.submitFeedback(details);
      const body = `Name: ${saved.name}\nEmail: ${saved.email}\nRating: ${saved.rating}/5\n\n${saved.message}`;
      emailLink.href = "mailto:moazzam9444@gmail.com?subject=" + encodeURIComponent("KICKS feedback from " + saved.name) + "&body=" + encodeURIComponent(body);
      emailLink.hidden = false;
      status.textContent = "Feedback saved on this browser. To send it to Mohammad directly, open the email draft below.";
      form.reset();
    } catch (error) {
      status.textContent = error.message;
    }
  });
}
