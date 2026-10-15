// بحث الملاعب وفلترتها وتقسيم النتائج إلى صفحات. نقرأ البيانات مباشرة من التخزين.
const fields = KicksStore.list("fields");
const filterForm = document.querySelector("#filterForm");
const search = document.querySelector("#fieldSearch");
const sort = document.querySelector("#sortFields");
const grid = document.querySelector("#fieldGrid");
const pagination = document.querySelector("#pagination");

let applied = {};
let page = 1;
const pageSize = 6;

function getResults() {
  const query = search.value.trim().toLowerCase();
  // نفحص كل شرط لوحده؛ إذا لم يطابق الملعب نخرجه من النتائج.
  const results = [];
  for (const field of fields) {
    const searchableText = (
      field.name +
      " " +
      field.city +
      " " +
      field.area
    ).toLowerCase();
    if (!searchableText.includes(query)) continue;
    if (applied.location && field.city !== applied.location) continue;
    if (applied.type && field.type !== applied.type) continue;
    if (applied.min && field.price < Number(applied.min)) continue;
    if (applied.max && field.price > Number(applied.max)) continue;
    if (applied.rating && field.rating < Number(applied.rating)) continue;
    if (applied.now && !field.now) continue;
    if (applied.today && !field.today) continue;
    results.push(field);
  }

  // ترتيب نسخة النتائج، وليس تغيير قائمة الملاعب الأصلية.
  if (sort.value === "price-low") {
    results.sort(function (firstField, secondField) {
      return firstField.price - secondField.price;
    });
  }
  if (sort.value === "price-high") {
    results.sort(function (firstField, secondField) {
      return secondField.price - firstField.price;
    });
  }
  if (sort.value === "rating") {
    results.sort(function (firstField, secondField) {
      return secondField.rating - firstField.rating;
    });
  }
  return results;
}

function render() {
  const results = getResults();
  const pages = Math.ceil(results.length / pageSize);
  page = Math.min(page, pages || 1);
  document.querySelector("#resultsCount").textContent =
    `${results.length} fields found`;
  document.querySelector("#resultsRange").textContent = results.length
    ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, results.length)} of ${results.length} fields`
    : "Try a different search or clear your filters.";
  let fieldCards = "";
  const firstField = (page - 1) * pageSize;
  const lastField = page * pageSize;
  const visibleFields = results.slice(firstField, lastField);
  for (const field of visibleFields) {
    let availability = "Fully booked today";
    let availabilityClass = "later";
    if (field.now) {
      availability = "Available now";
      availabilityClass = "";
    } else if (field.today) {
      availability = "Available today";
    }
    fieldCards += `
      <article class="catalog-card">
        <div class="catalog-image">
          <img src="${KicksAuth.fieldImage(field)}" alt="Football pitch at ${KicksStore.escape(field.name)}" loading="lazy">
          <span class="availability ${availabilityClass}">${availability}</span>
          <span class="format-badge">${KicksStore.escape(field.type)}</span>
        </div>
        <div class="catalog-body">
          <div class="card-heading">
            <h3>${KicksStore.escape(field.name)}</h3>
            <span class="rating"><i class="bi bi-star-fill" aria-hidden="true"></i> ${field.rating.toFixed(1)}</span>
          </div>
          <p class="catalog-location"><i class="bi bi-geo-alt" aria-hidden="true"></i> ${KicksStore.escape(field.area)}, ${KicksStore.escape(field.city)}</p>
          <div class="amenities"><span><i class="bi bi-grid-3x3" aria-hidden="true"></i> Artificial turf</span><span><i class="bi bi-lightbulb" aria-hidden="true"></i> Floodlights</span></div>
          <div class="card-bottom">
            <p><strong>${field.price} <small>JD</small></strong><span> / hour</span></p>
            <a class="view-field" href="field-details.html?id=${field.id}">View field <span aria-hidden="true">↗</span><span class="visually-hidden">: ${KicksStore.escape(field.name)}</span></a>
          </div>
        </div>
      </article>`;
  }
  grid.innerHTML = fieldCards;
  document.querySelector("#emptyState").hidden = results.length > 0;
  // نبني أزرار الصفحات بالتسلسل بدل تعبير واحد طويل.
  let pageButtons = "";
  if (pages > 1) {
    let previousDisabled = "";
    if (page === 1) previousDisabled = "disabled";
    pageButtons +=
      '<button data-page="' +
      (page - 1) +
      '" ' +
      previousDisabled +
      ' aria-label="Previous page">←</button>';
    for (let pageNumber = 1; pageNumber <= pages; pageNumber++) {
      let currentPage = "";
      if (page === pageNumber) currentPage = 'aria-current="page"';
      pageButtons +=
        '<button data-page="' +
        pageNumber +
        '" ' +
        currentPage +
        ">" +
        pageNumber +
        "</button>";
    }
    let nextDisabled = "";
    if (page === pages) nextDisabled = "disabled";
    pageButtons +=
      '<button data-page="' +
      (page + 1) +
      '" ' +
      nextDisabled +
      ' aria-label="Next page">→</button>';
  }
  pagination.innerHTML = pageButtons;

  let hasFilters = false;
  for (const value of Object.values(applied)) {
    if (value) hasFilters = true;
  }
  const filterMessage = document.querySelector("#activeFilters");
  filterMessage.textContent = "All pitches. All possibilities.";
  if (hasFilters)
    filterMessage.textContent = "Filters applied · Clear to see all fields";
}

filterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = {};
  for (const [name, value] of new FormData(filterForm)) {
    values[name] = value;
  }
  const max = filterForm.elements.max;
  max.setCustomValidity("");
  if (values.min && values.max && Number(values.min) > Number(values.max)) {
    max.setCustomValidity("Maximum price must be at least the minimum price.");
  }
  if (!filterForm.reportValidity()) return;
  applied = values;
  page = 1;
  render();
});
filterForm.addEventListener("input", () =>
  filterForm.elements.max.setCustomValidity(""),
);
function clearFilters() {
  filterForm.reset();
  filterForm.elements.max.setCustomValidity("");
  applied = {};
  search.value = "";
  page = 1;
  render();
}
document
  .querySelectorAll("[data-clear]")
  .forEach((button) => button.addEventListener("click", clearFilters));
search.addEventListener("input", () => {
  page = 1;
  render();
});
document.querySelector("#searchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  page = 1;
  render();
  document
    .querySelector("#results")
    .scrollIntoView({ behavior: "smooth", block: "start" });
});
sort.addEventListener("change", () => {
  page = 1;
  render();
});
pagination.addEventListener("click", (event) => {
  const button = event.target.closest("[data-page]");
  if (!button || button.disabled) return;
  page = Number(button.dataset.page);
  render();
  document
    .querySelector("#results")
    .scrollIntoView({ behavior: "smooth", block: "start" });
});
const toggle = document.querySelector("#filterToggle");
toggle.addEventListener("click", () => {
  const open = toggle.getAttribute("aria-expanded") !== "true";
  toggle.setAttribute("aria-expanded", String(open));
  document.querySelector("#filterPanel").classList.toggle("is-open", open);
});
render();
