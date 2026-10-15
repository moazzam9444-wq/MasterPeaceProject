// نقرأ إعدادات التواصل فقط حتى يبقى نص About خاصاً بهذه الصفحة.
{
  const settings = KicksStore.settings();
  const city = document.getElementById('aboutCity');
  const contact = document.getElementById('aboutContact');

  city.textContent = settings.city;
  city.hidden = !settings.city;
  contact.textContent = settings.contact;
  contact.hidden = !settings.contact;
}
