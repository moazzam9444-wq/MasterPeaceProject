# Shared table pagination

All application HTML entry pages load table-pagination.js and its stylesheet. Every populated table shows at most eight data rows; tables with eight or fewer rows have no visible page bar. Larger tables show record ranges, numbered pages and previous/next controls, with compact gaps for large page counts. Multiple tables have independent page state. Empty colspan placeholders are not counted as records.

Dashboard search delegates filtering to the paginator before taking the page slice, searches the complete dataset and resets to page one on a changed query. Search counters report matching totals, not just the eight currently visible rows. Dynamic replacement/insertion/removal of rows is observed; valid page positions are retained across rerenders, and a shortened last page is clamped. DOM rows and existing action handlers are retained. No store or financial data is mutated by pagination.

The bar wraps on small screens, uses theme tokens and native keyboard-accessible buttons, announces range changes and marks the current page. Each table can opt out via data-no-pagination, though application tables currently use the default. Print reveals all rows and hides navigation.

Verification: table-pagination-browser.cjs uses actual login and isolated demo storage, covering 58 accounts, paging bounds, search including records on later pages, empty search, edit actions and page retention, 48 memberships, revenue history, independent dynamic tables, last-page removal, short-table suppression and narrow-screen overflow. Split checkout history checks now search for their target booking rather than assuming every historical row is visible on the first page.
