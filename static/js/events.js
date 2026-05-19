(function () {
  var grid = document.getElementById('events-grid');
  if (!grid) return;

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var cards = Array.from(grid.querySelectorAll('.event-card[data-event-date]'));
  var upcoming = [];
  var past = [];

  cards.forEach(function (card) {
    var eventDate = new Date(card.dataset.eventDate + 'T00:00:00');
    if (eventDate < today) {
      card.classList.add('is-past');
      past.push(card);
    } else {
      upcoming.push(card);
    }
  });

  // Upcoming: ascending (nearest first); past: descending (most recent first)
  past.sort(function (a, b) {
    return new Date(b.dataset.eventDate) - new Date(a.dataset.eventDate);
  });

  upcoming.concat(past).forEach(function (card) {
    grid.appendChild(card);
  });
})();
