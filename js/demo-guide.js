// Read-only guide to the existing demo workflows; uses ordinary Login links.
(() => {
 document.addEventListener('DOMContentLoaded',()=>{
  const section=document.createElement('section');section.className='steps';section.dir='rtl';
  section.innerHTML=`<h2>ابدأ تجربة السايكلز</h2><p>نفس صفحات الموقع وتصميمه. سجّل خروج ودخول لتبديل الدور، واستخدم تبويب واحد للحفظ. كل الدفع والبيانات تجريبية.</p>
  <p><a href="../../index.html">افتح الموقع ↗</a> · <a href="../Auth/login.html">تسجيل الدخول ↗</a></p>
  <h3>حسابات الدخول</h3><p>الباسورد لجميع حسابات العينة: <code dir="ltr">KicksDemo2026!</code></p>
  <div style="overflow-x:auto"><table style="width:100%;text-align:start;border-collapse:collapse"><thead><tr><th>الحساب</th><th>الإيميل</th><th>استخدمه لـ</th></tr></thead><tbody>
  <tr><td>الأدمن</td><td dir="ltr">sample100@kicks.example.test</td><td>الموافقات والإدارة والسجلات</td></tr>
  <tr><td>صاحب ملعب عمّان</td><td dir="ltr">sample101@kicks.example.test</td><td>الملاعب والحجوزات وبطولة Rimal</td></tr>
  <tr><td>صاحبة ملاعب</td><td dir="ltr">sample102@kicks.example.test</td><td>إدارة الأحداث التابعة لملاعبها</td></tr>
  <tr><td>كابتن Rimal Amman</td><td dir="ltr">sample200@kicks.example.test</td><td>الروستر والطلبات والتشالنج والبطولات</td></tr>
  <tr><td>كابتن Zarqa Comets</td><td dir="ltr">sample206@kicks.example.test</td><td>تجربة الطرف المنافس</td></tr>
  <tr><td>كابتن Salt Cedars</td><td dir="ltr">sample218@kicks.example.test</td><td>تسجيل تيم إضافي ببطولة Rimal</td></tr>
  <tr><td>لاعب ضمن تيم</td><td dir="ltr">sample201@kicks.example.test</td><td>الروستر وتاريخ مشاركات التيم</td></tr>
  <tr><td>لاعب حر</td><td dir="ltr">sample262@kicks.example.test</td><td>بدء رحلة حجز أو انضمام لتيم ومباراة</td></tr>
  </tbody></table></div>
  <h3>١ · لاعب جديد وحجز ملعب</h3><p>ادخل باللاعب الحر، افتح الملاعب واختر ملعبًا وموعدًا متاحًا، وأكمل الدفع التجريبي. راجع الحجز بلوحة اللاعب، ثم ادخل بصاحب نفس الملعب لمشاهدة الحجز عنده.</p>
  <h3>٢ · مباراة مفتوحة</h3><p>اختَر مباراة مستقبلية فيها مقعد متاح، وانضم بالمركز المطلوب. راجع My games وعدّاد المشاركين. توجد أيضًا مباراة ممتلئة لتجربة منع الانضمام.</p>
  <h3>٣ · التيم والريكويست</h3><p>باللاعب الحر اطلب الانضمام إلى Rimal Amman. سجّل خروج، وادخل بـ sample200، ثم Teams ← My team ← Manage team ← Requests واقبل الطلب. ارجع للاعب لتشوف عضويته والروستر.</p>
  <h3>٤ · التشالنج والدفع بالنص</h3><p>ادخل بالكابتن 200 وانشر تحديًا جديدًا: اختَر المدينة والموعد والملعب وشوف السعر ونصيب كل تيم. ادخل بالكابتن 206 وقدّم طلب المنافسة، ثم ارجع للأول واقبله. يبدأ حجز مؤقت لمدة ١٥ دقيقة؛ كل كابتن يفتح التحدي ويدفع نصه بالدفع التجريبي. بعد الدفعتين يتأكد الحجز عند الكابتنين وصاحب الملعب. إذا انتهت المهلة أو انلغى قبل التأكيد، ينفك الموعد وتنرد أي دفعة تجريبية. التحديات القديمة محفوظة بمسارها القديم.</p>
  <h3>٥ · البطولة من التسجيل للبطل</h3><p>إنشاء البطولات الجديدة للأدمن فقط، ورسوم اشتراك التيمات تذهب كاملة لإيرادات المنصة. بطولة <a href="../Tournaments/tournament-details.html?id=3001">Rimal Community Cup</a> فيها ٣ تيمات مسجلة. ادخل بالكابتن 218 وسجّل التيم الرابع، ثم بالأدمن 100 لبدء القرعة واعتماد الفائزين حتى البطل. راجع بطولات الكباتن وروستر التسجيل. حجز الملعب منفصل عن رسوم البطولة.</p>
  <p>للمشاهدة المباشرة: <a href="../Tournaments/tournament-details.html?id=3003">بطولة جارية</a> · <a href="../Tournaments/tournament-details.html?id=3004">بطولة مكتملة</a>. القرعة تعتمد الفائز والتأهل؛ لا يوجد نظام نتائج رقمية جديد مضاف للديمو.</p>
  <h3>٦ · الإدارة والرسائل</h3><p>ادخل بالأدمن لمراجعة طلبات الحسابات والإيرادات والسجلات. الرسائل تظهر حسب صلاحيات الحساب وعلاقته بالحجز أو التحدي؛ التواصل في الموقع بالرسائل فقط.</p>`;
  document.querySelector('main').append(section);
 });
})();
