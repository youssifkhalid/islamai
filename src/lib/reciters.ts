export type Reciter = {
  id: string;
  audioBase: string; // everyayah per-ayah folder (for highlighting mode)
  surahServer?: string; // mp3quran full-surah server (no cutting); ends with /
  bitrateKbps: number;
  name: string;
  country: string;
  bio: string;
  style?: string;
  aliases?: string[];
};

// surahServer points to mp3quran.net full-surah files: `${surahServer}{NNN}.mp3`
export const RECITERS: Reciter[] = [
  { id: "ar.alafasy", audioBase: "Alafasy_128kbps", surahServer: "https://server8.mp3quran.net/afs/", bitrateKbps: 128, name: "مشاري راشد العفاسي", country: "الكويت", style: "مرتل", aliases: ["العفاسي", "mishary"], bio: "إمام وقارئ كويتي، من أكثر الأصوات انتشاراً وخشوعاً." },
  { id: "ar.yasser-dussary", audioBase: "Yasser_Ad-Dussary_128kbps", surahServer: "https://server11.mp3quran.net/yasser/", bitrateKbps: 128, name: "ياسر الدوسري", country: "السعودية", style: "مرتل", aliases: ["الدوسري", "dussary"], bio: "إمام الحرم المكي، تلاوة قوية خاشعة وأداء مؤثر." },
  { id: "ar.mahermuaiqly", audioBase: "MaherAlMuaiqly128kbps", surahServer: "https://server12.mp3quran.net/maher/", bitrateKbps: 128, name: "ماهر المعيقلي", country: "السعودية", style: "مرتل", aliases: ["المعيقلي"], bio: "إمام المسجد الحرام، تلاوته هادئة واضحة محببة." },
  { id: "ar.abdurrahmaansudais", audioBase: "Abdurrahmaan_As-Sudais_192kbps", surahServer: "https://server11.mp3quran.net/sds/", bitrateKbps: 192, name: "عبد الرحمن السديس", country: "السعودية", style: "مرتل", aliases: ["السديس"], bio: "إمام وخطيب المسجد الحرام، صوت جهوري عالمي." },
  { id: "ar.saoodshuraym", audioBase: "Saood_ash-Shuraym_128kbps", surahServer: "https://server7.mp3quran.net/shur/", bitrateKbps: 128, name: "سعود الشريم", country: "السعودية", style: "مرتل", aliases: ["الشريم"], bio: "إمام الحرم المكي سابقاً، قوة أداء وضبط تلاوة." },
  { id: "ar.abdulbasitmurattal", audioBase: "Abdul_Basit_Murattal_192kbps", surahServer: "https://server7.mp3quran.net/basit/", bitrateKbps: 192, name: "عبد الباسط عبد الصمد", country: "مصر", style: "مرتل", aliases: ["عبدالباسط"], bio: "أحد أعلام التلاوة، صوته من أشهر الأصوات إسلامياً." },
  { id: "ar.husary", audioBase: "Husary_128kbps", surahServer: "https://server13.mp3quran.net/husr/", bitrateKbps: 128, name: "محمود خليل الحصري", country: "مصر", style: "مرتل", aliases: ["الحصري"], bio: "شيخ المقارئ المصرية، مرجع في وضوح النطق والتجويد." },
  { id: "ar.minshawi", audioBase: "Minshawy_Murattal_128kbps", surahServer: "https://server10.mp3quran.net/minsh/", bitrateKbps: 128, name: "محمد صديق المنشاوي", country: "مصر", style: "مرتل", aliases: ["المنشاوي"], bio: "صوت خاشع عذب من أعظم قراء العصر الحديث." },
  { id: "ar.muhammadayyoub", audioBase: "Muhammad_Ayyoub_128kbps", surahServer: "https://server16.mp3quran.net/ayyoub2/Rewayat-Hafs-A-n-Assem/", bitrateKbps: 128, name: "محمد أيوب", country: "السعودية", style: "مرتل", aliases: ["أيوب"], bio: "إمام المسجد النبوي سابقاً، ترتيل هادئ خاشع." },
  { id: "ar.shaatree", audioBase: "Abu_Bakr_Ash-Shaatree_128kbps", surahServer: "https://server11.mp3quran.net/shatri/", bitrateKbps: 128, name: "أبو بكر الشاطري", country: "السعودية", style: "مرتل", aliases: ["الشاطري"], bio: "قارئ سعودي بصوت رخيم وأداء واضح." },
  { id: "ar.ahmedajamy", audioBase: "Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net", surahServer: "https://server10.mp3quran.net/ajm/", bitrateKbps: 128, name: "أحمد بن علي العجمي", country: "السعودية", style: "مرتل", aliases: ["العجمي"], bio: "قارئ سعودي مشهور بصوت مميز وترتيل متقن." },
  { id: "ar.hudhaify", audioBase: "Hudhaify_128kbps", surahServer: "https://server9.mp3quran.net/hthfi/Rewayat-Sho-bah-A-n-Asim/", bitrateKbps: 128, name: "علي الحذيفي", country: "السعودية", style: "مرتل", aliases: ["الحذيفي"], bio: "إمام المسجد النبوي، من كبار القراء المعاصرين." },
  { id: "ar.abdullahbasfar", audioBase: "Abdullah_Basfar_192kbps", surahServer: "https://server6.mp3quran.net/bsfr/", bitrateKbps: 192, name: "عبد الله بصفر", country: "السعودية", style: "مرتل", aliases: ["بصفر"], bio: "قارئ وأكاديمي سعودي، تلاوة هادئة مضبوطة." },
  { id: "ar.muhammadjibreel", audioBase: "Muhammad_Jibreel_128kbps", surahServer: "https://server8.mp3quran.net/jbrl/", bitrateKbps: 128, name: "محمد جبريل", country: "مصر", style: "مرتل", aliases: ["جبريل"], bio: "قارئ مصري مشهور بخشوعه ودعائه المؤثر." },
  { id: "ar.ibrahimakhbar", audioBase: "Ibrahim_Akhdar_64kbps", surahServer: "https://server6.mp3quran.net/akdr/", bitrateKbps: 64, name: "إبراهيم الأخضر", country: "السعودية", style: "مرتل", aliases: ["الأخضر"], bio: "من قراء المدينة ورواد تعليم القرآن." },
  { id: "ar.ahmedneana", audioBase: "Ahmed_Neana_128kbps", surahServer: "https://server11.mp3quran.net/ahmad_nu/", bitrateKbps: 128, name: "أحمد نعينع", country: "مصر", style: "مرتل", aliases: ["نعينع"], bio: "قارئ مصري كبير بصوت رخيم متمكن." },
  { id: "ar.ghamadi", audioBase: "Ghamadi_40kbps", surahServer: "https://server7.mp3quran.net/s_gmd/", bitrateKbps: 128, name: "سعد الغامدي", country: "السعودية", style: "مرتل", aliases: ["الغامدي"], bio: "قارئ سعودي بصوت خاشع وسهل المتابعة." },
  { id: "ar.hanirifai", audioBase: "Hani_Rifai_192kbps", surahServer: "https://server8.mp3quran.net/hani/", bitrateKbps: 128, name: "هاني الرفاعي", country: "السعودية", style: "مرتل", aliases: ["الرفاعي"], bio: "قارئ معاصر مشهور بخشوع شديد وتأثير واضح." },
  { id: "ar.nasserqatami", audioBase: "Nasser_Alqatami_128kbps", surahServer: "https://server6.mp3quran.net/qtm/", bitrateKbps: 128, name: "ناصر القطامي", country: "السعودية", style: "مرتل", aliases: ["القطامي"], bio: "قارئ سعودي بصوت مؤثر وأداء حديث محبوب." },
  { id: "ar.sahl-yassin", audioBase: "Sahl_Yassin_128kbps", surahServer: "https://server6.mp3quran.net/shl/", bitrateKbps: 128, name: "سهل ياسين", country: "العراق", style: "مرتل", aliases: ["سهل"], bio: "قارئ بصوت واضح وهادئ." },
  { id: "ar.salah-budair", audioBase: "Salah_Al_Budair_128kbps", surahServer: "https://server6.mp3quran.net/s_bud/", bitrateKbps: 128, name: "صلاح البدير", country: "السعودية", style: "مرتل", aliases: ["البدير"], bio: "إمام المسجد النبوي، جمال الأداء ورصانته." },
  { id: "ar.abdullah-matroud", audioBase: "Abdullah_Matroud_128kbps", surahServer: "https://server8.mp3quran.net/mtrod/", bitrateKbps: 128, name: "عبد الله مطرود", country: "السعودية", style: "مرتل", aliases: ["مطرود"], bio: "قارئ سعودي صاحب تلاوة ندية وخاشعة." },
  { id: "ar.ali-jaber", audioBase: "Ali_Jaber_64kbps", surahServer: "https://server11.mp3quran.net/a_jbr/", bitrateKbps: 64, name: "علي جابر", country: "السعودية", style: "مرتل", aliases: ["جابر"], bio: "إمام الحرم المكي سابقاً، من الأصوات الراسخة." },
  { id: "ar.fares-abbad", audioBase: "Fares_Abbad_64kbps", surahServer: "https://server8.mp3quran.net/frs_a/", bitrateKbps: 64, name: "فارس عباد", country: "اليمن", style: "مرتل", aliases: ["عباد"], bio: "قارئ يمني واسع الانتشار بصوت هادئ مؤثر." },
  { id: "ar.tablaway", audioBase: "Mohammad_al_Tablaway_128kbps", surahServer: "https://server12.mp3quran.net/tblawi/Al-Mojawwad/", bitrateKbps: 128, name: "محمد محمود الطبلاوي", country: "مصر", style: "مجوّد", aliases: ["الطبلاوي"], bio: "نقيب قراء مصر سابقاً، صاحب مدرسة صوتية مميزة." },
  { id: "ar.mustafa-ismail", audioBase: "Mustafa_Ismail_48kbps", surahServer: "https://server8.mp3quran.net/mustafa/Almusshaf-Al-Mojawwad/", bitrateKbps: 48, name: "مصطفى إسماعيل", country: "مصر", style: "مجوّد", aliases: ["مصطفى اسماعيل"], bio: "من عباقرة التلاوة والمقامات القرآنية." },
  { id: "ar.khalid-qahtani", audioBase: "Khaalid_Abdullaah_al-Qahtaanee_192kbps", surahServer: "https://server10.mp3quran.net/qht/", bitrateKbps: 128, name: "خالد القحطاني", country: "السعودية", style: "مرتل", aliases: ["القحطاني"], bio: "قارئ سعودي بصوت قوي وخاشع." },
  { id: "ar.tunaiji", audioBase: "khalefa_al_tunaiji_64kbps", surahServer: "https://server12.mp3quran.net/tnjy/", bitrateKbps: 64, name: "خليفة الطنيجي", country: "الإمارات", style: "مرتل", aliases: ["الطنيجي"], bio: "قارئ إماراتي بصوت واضح مناسب للحفظ." },
  { id: "ar.banna", audioBase: "mahmoud_ali_al_banna_32kbps", surahServer: "https://server8.mp3quran.net/bna/Almusshaf-Al-Mojawwad/", bitrateKbps: 64, name: "محمود علي البنا", country: "مصر", style: "مرتل", aliases: ["البنا"], bio: "من أعلام دولة التلاوة المصرية بصوت أصيل." },
];

export function findReciter(query?: string): Reciter {
  if (!query) return RECITERS[0];
  const q = query.toLowerCase();
  return RECITERS.find((r) => r.id === query || r.name.includes(query) || r.aliases?.some((a) => q.includes(a.toLowerCase()))) ?? RECITERS[0];
}
