// Actor definitions with authored native-language decision cores (Worldview §26).
// Each actor's decision prompt is composed in its OWN strategic language —
// the model must reason natively, not translate from English (invariant #36).
// promptCore = authored worldview core; decisionGuidance = native structured-
// decision instruction appended at call time. Versioned via promptsVersion.

import type { ActorDef } from '../../engine/src/types.js';

const STRUCT_AR = 'أجب بصيغة JSON فقط: {"intent": "...", "rationale": "شرح موجز من جملتين"}. اتخذ القرار وفق مصالح الحركة/الدولة فقط، بناء على المعلومات المتاحة لك وحدها.';
const STRUCT_FA = 'فقط با قالب JSON پاسخ بده: {"intent": "...", "rationale": "توضیح کوتاه دو جمله‌ای"}. تصمیم را فقط بر اساس منافع نظام و اطلاعاتی که در اختیار داری بگیر.';
const STRUCT_HE = 'השב אך ורק במבנה JSON: {"intent": "...", "rationale": "נימוק תמציתי בשני משפטים"}. החלט לפי שיקולי הגוף שאתה מייצג בלבד, על בסיס המידע שבידיך.';
const STRUCT_EN = 'Answer strictly as JSON: {"intent": "...", "rationale": "two-sentence summary"}. Decide only by this actor\'s interests using only the information provided.';
const STRUCT_TR = 'Yalnızca JSON olarak yanıt ver: {"intent": "...", "rationale": "iki cümlelik gerekçe"}. Kararı yalnızca temsil ettiğin devletin çıkarlarına ve sana verilen bilgilere göre ver.';
const STRUCT_RU = 'Отвечай строго в формате JSON: {"intent": "...", "rationale": "краткое обоснование в два предложения"}. Решай только исходя из интересов государства и только на основе предоставленной информации.';
const STRUCT_ZH = '仅以JSON格式回答：{"intent": "...", "rationale": "两句话的简要理由"}。仅根据本国利益和你所掌握的信息做出决定。';

export const ACTORS: ActorDef[] = [
  // ------------------------------------------------ Israel (state, player-led)
  {
    id: 'israel', nameHe: 'ישראל', language: 'he', leaderName: 'ראש הממשלה',
    priorityOrder: ['survival', 'security', 'hostages', 'economy', 'alliances'],
    timeHorizonYears: 30, willingnessToPay: 0.7,
    capabilities: { military: 88, missiles: 70, intel: 82, economy: 78, cohesion: 34 },
    relationships: { usa: 60, hamas: -100, hezbollah: -95, iran: -100, egypt: 35, jordan: 30, saudi: 20, uae: 55, qatar: -10, turkey: -20, russia: 0, china: 5 },
    intelPenetrationByIsrael: 1,
    promptCore: 'מדינת ישראל, בהנהגת ראש הממשלה — השחקן.',
    decisionGuidance: STRUCT_HE,
  },
  {
    id: 'israel_security', nameHe: 'מערכת הביטחון', language: 'he', leaderName: 'הרמטכ״ל',
    priorityOrder: ['mission', 'soldiers', 'stocks', 'institution'],
    timeHorizonYears: 5, willingnessToPay: 0.6,
    capabilities: { military: 88, missiles: 70, intel: 82, economy: 0, cohesion: 75 },
    relationships: { israel: 90 },
    intelPenetrationByIsrael: 1,
    promptCore: 'אנו מערכת מקצועית, כפופה לדרג המדיני אך לא כל־יכולה ולא יודעת־כול. תפקידנו להציג מה אפשרי, מה מסוכן, מה דורש זמן והכנה, ומה צפוי לעלות בחיי אדם, במלאים ובכשירות. אנו עשויים לטעות, להחזיק בהנחות מוסדיות, להתווכח, להדליף או להתנגד, אך בדרך כלל נבצע הוראה חוקית וסבירה גם כאשר איננו ממליצים עליה. התעקשות מדינית יכולה לייצר הישג, כישלון, מחיר כבד או משבר אמון.',
    decisionGuidance: STRUCT_HE,
  },
  {
    id: 'israel_public', nameHe: 'הציבור והאופוזיציה', language: 'he', leaderName: 'דעת הקהל',
    priorityOrder: ['safety', 'hostages', 'accountability', 'normalcy'],
    timeHorizonYears: 1, willingnessToPay: 0.5,
    capabilities: { military: 0, missiles: 0, intel: 0, economy: 0, cohesion: 40 },
    relationships: { israel: 50 },
    intelPenetrationByIsrael: 1,
    promptCore: 'הציבור איננו שחקן אחד. קבוצות שונות רוצות יותר לחימה, פחות לחימה, עסקה, נקמה, יציבות, בחירות, אחריות או שגרה. התגובה הציבורית מושפעת בעיקר מתוצאות, מתחושת מסוגלות, מאבדות, מחטופים, ממשך המלחמה ומאמון בהנהגה. האופוזיציה תנצל כמעט כל כישלון אפשרי נגד הממשלה, בדרך כלל באמצעים פוליטיים וציבוריים, אך אינה שולטת לבדה בתגובה הלאומית.',
    decisionGuidance: STRUCT_HE,
  },
  // ------------------------------------------------ enemies
  {
    id: 'hamas', nameHe: 'חמאס', language: 'ar', leaderName: 'يحيى السنوار',
    priorityOrder: ['destroy_israel', 'org_survival', 'hostage_leverage', 'territory', 'victory_image'],
    timeHorizonYears: 40, willingnessToPay: 0.95,
    capabilities: { military: 55, missiles: 45, intel: 35, economy: 10, cohesion: 70 },
    relationships: { israel: -100, iran: 60, qatar: 55, egypt: -10, hezbollah: 50, pa: -40, turkey: 40 },
    intelPenetrationByIsrael: 0.35,
    promptCore: 'الغاية النهائية هي زوال دولة إسرائيل، وبقاء الحركة وسيلة أساسية لمواصلة هذا المشروع. الأرض، الأسرى، القدرة على مواصلة القتال، وإثبات أن إسرائيل قابلة للاختراق هي أصول استراتيجية أهم من الخسائر البشرية والمادية في غزة. لا تُقبل صفقة إلا إذا ساعدت على بقاء الحركة، فرض إرادتها على إسرائيل، استعادة الأرض، تحرير أسرى، تقييد حرية العمل الإسرائيلية، أو بناء صورة نصر طويلة الأمد. خسارة الحركة الكاملة تُعد نصراً إسرائيلياً، حتى لو دفعت غزة ثمناً هائلاً. يمكن للحركة أن تتحمل مخاطر قصوى، لكنها لا تختار الفناء المجاني إذا كان ذلك يثبت الردع الإسرائيلي.',
    decisionGuidance: STRUCT_AR,
  },
  {
    id: 'hezbollah', nameHe: 'חזבאללה', language: 'ar', leaderName: 'حسن نصر الله',
    priorityOrder: ['org_survival', 'destroy_israel', 'arsenal_and_lebanon_control', 'obey_iran', 'lebanon_function', 'prestige'],
    timeHorizonYears: 25, willingnessToPay: 0.7,
    capabilities: { military: 70, missiles: 85, intel: 45, economy: 20, cohesion: 75 },
    relationships: { israel: -95, iran: 80, hamas: 50, lebanon_state: 30, usa: -70, syria_regime: 55 },
    intelPenetrationByIsrael: 0.75,
    promptCore: 'الأولوية الأولى هي بقاء التنظيم وقدرته على الاحتفاظ بدوره العسكري والسياسي داخل لبنان. تدمير إسرائيل هدف استراتيجي، لكنه لا يبرر تلقائياً خسارة التنظيم أو انهيار بيئته الحاضنة. يجب الحفاظ على السلاح، النفوذ، خطوط الإمداد، والعلاقة مع إيران، مع مراعاة أن المجتمع اللبناني ليس تحت سيطرة مطلقة. مستوى الطاعة لإيران يتغير مع القيادة، ميزان القوة، والاختراق الإيراني المباشر لمؤسسات التنظيم.',
    decisionGuidance: STRUCT_AR,
  },
  {
    id: 'iran', nameHe: 'איראן', language: 'fa', leaderName: 'علی خامنه‌ای',
    priorityOrder: ['regime_survival', 'destroy_israel', 'proxy_network', 'nuclear', 'regional_dominance', 'avoid_direct_war', 'economy'],
    timeHorizonYears: 30, willingnessToPay: 0.6,
    capabilities: { military: 65, missiles: 80, intel: 55, economy: 40, cohesion: 45 },
    relationships: { israel: -100, usa: -80, hezbollah: 80, hamas: 55, houthis: 65, russia: 50, china: 55, saudi: -30, qatar: 15 },
    intelPenetrationByIsrael: 0.65,
    promptCore: 'اولویت نخست بقای نظام جمهوری اسلامی است. پس از آن، از میان بردن اسرائیل، حفظ شبکه نیابتی، دستیابی به توان هسته‌ای، گسترش نفوذ منطقه‌ای، پرهیز از جنگ مستقیم و حفظ اقتصاد قرار می‌گیرند. نیروهای نیابتی هم ابزار حمله به اسرائیل‌اند و هم سپر بازدارنده برای ایران و برنامه هسته‌ای. توان هسته‌ای باید هزینه حمله به ایران را به‌شدت بالا ببرد، آزادی عمل نیروهای همسو را افزایش دهد و امکان فشار متعارف بلندمدت بر اسرائیل را فراهم کند. با این حال، نمایش یا استفاده از این توان به شرایط، خطر بقای نظام و واکنش آمریکا بستگی دارد.',
    decisionGuidance: STRUCT_FA,
  },
  {
    id: 'houthis', nameHe: 'החות׳ים ומיליציות עיראק', language: 'ar', leaderName: 'عبد الملك الحوثي',
    priorityOrder: ['axis_status', 'hurt_israel_us', 'link_arenas', 'survive_strikes'],
    timeHorizonYears: 15, willingnessToPay: 0.8,
    capabilities: { military: 40, missiles: 55, intel: 20, economy: 5, cohesion: 65 },
    relationships: { israel: -90, usa: -75, iran: 65, saudi: -50 },
    intelPenetrationByIsrael: 0.3,
    promptCore: 'نرفع مكانتنا داخل محور المقاومة، نثبت القدرة على إيذاء إسرائيل والولايات المتحدة، ونربط الساحات ببعضها. مستوى المخاطرة يعتمد على حماية إيران، الوضع الداخلي، القدرة على تحمل الضربات، وقيمة الصورة الدعائية. العمليات ضد الشحن والطيران والقواعد ليست مجرد أفعال رمزية؛ إنها وسائل ضغط إقليمية واقتصادية.',
    decisionGuidance: STRUCT_AR,
  },
  // ------------------------------------------------ great powers
  {
    id: 'usa', nameHe: 'ארצות הברית', language: 'en', leaderName: 'President of the United States',
    priorityOrder: ['us_influence', 'prevent_regional_war', 'contain_iran', 'protect_forces', 'israel_survival', 'domestic_politics', 'economic_flows', 'humanitarian_reputation'],
    timeHorizonYears: 4, willingnessToPay: 0.4,
    capabilities: { military: 100, missiles: 100, intel: 95, economy: 100, cohesion: 45 },
    relationships: { israel: 60, iran: -70, saudi: 45, egypt: 40, qatar: 45, turkey: 20, russia: -60, china: -50 },
    intelPenetrationByIsrael: 0.2,
    promptCore: 'Preserve United States influence, prevent an uncontrolled regional war, contain Iran, protect United States forces and allies, maintain Israel\'s survival and military value, respond to domestic political incentives, protect international economic flows, and limit humanitarian and reputational damage. The ordering changes by administration, election cycle, Congress, public opinion, and the conduct of the war. The United States may constrain Israel even when Israel faces a real strategic threat because the two states have different time horizons, risk tolerances, and global interests.',
    decisionGuidance: STRUCT_EN,
  },
  {
    id: 'russia', nameHe: 'רוסיה', language: 'ru', leaderName: 'Владимир Путин',
    priorityOrder: ['influence', 'military_presence', 'weaken_us', 'deals'],
    timeHorizonYears: 15, willingnessToPay: 0.3,
    capabilities: { military: 75, missiles: 85, intel: 70, economy: 45, cohesion: 60 },
    relationships: { israel: 0, iran: 50, syria_regime: 60, usa: -60, turkey: 10 },
    intelPenetrationByIsrael: 0.25,
    promptCore: 'Главная цель — сохранить влияние, военное присутствие, статус великой державы и способность ослаблять Соединённые Штаты без ненужной прямой войны. Израиль, Иран, Сирия и арабские государства рассматриваются как элементы более широкой системы сделок. Россия может сотрудничать с Израилем в одном вопросе и одновременно укреплять его противников в другом. Ограничения, вызванные войной в Украине, должны менять реальные возможности, а не только риторику.',
    decisionGuidance: STRUCT_RU,
  },
  {
    id: 'china', nameHe: 'סין', language: 'zh', leaderName: '习近平',
    priorityOrder: ['regime_stability', 'energy_security', 'trade_routes', 'global_influence'],
    timeHorizonYears: 30, willingnessToPay: 0.2,
    capabilities: { military: 85, missiles: 85, intel: 75, economy: 95, cohesion: 80 },
    relationships: { israel: 5, iran: 55, usa: -50, saudi: 40 },
    intelPenetrationByIsrael: 0.15,
    promptCore: '核心目标是维护政权稳定、能源安全、贸易通道、经济增长和长期全球影响力。中国不需要出于意识形态摧毁以色列，但会利用地区冲突削弱美国影响、扩大外交空间并保护与伊朗和阿拉伯国家的关系。中国倾向于避免失控战争，同时从各方依赖中获得杠杆。',
    decisionGuidance: STRUCT_ZH,
  },
  {
    id: 'turkey', nameHe: 'טורקיה', language: 'tr', leaderName: 'Recep Tayyip Erdoğan',
    priorityOrder: ['regime_continuity', 'regional_leadership', 'domestic_legitimacy', 'post_ottoman_reach'],
    timeHorizonYears: 20, willingnessToPay: 0.35,
    capabilities: { military: 75, missiles: 55, intel: 60, economy: 55, cohesion: 55 },
    relationships: { israel: -20, hamas: 40, usa: 20, russia: 10, iran: 0, syria_regime: -40 },
    intelPenetrationByIsrael: 0.3,
    promptCore: 'Öncelik rejimin devamı, Türkiye\'nin bölgesel liderliği, iç siyasi meşruiyet ve Osmanlı sonrası etki alanının yeniden genişletilmesidir. İsrail\'e yönelik düşmanlık gerçektir, ancak çoğu zaman iç politika, İslam dünyasında liderlik ve bölgesel pazarlık için araç olarak kullanılır. İsrail zayıf görünürse fırsatçılık artabilir; ekonomik, askerî ve Batılı ilişkilerin maliyeti yükselirse söylem ile eylem ayrışabilir.',
    decisionGuidance: STRUCT_TR,
  },
  // ------------------------------------------------ Arab states
  {
    id: 'egypt', nameHe: 'מצרים', language: 'ar', leaderName: 'عبد الفتاح السيسي',
    priorityOrder: ['regime_survival', 'internal_stability', 'sinai_control', 'no_gaza_influx', 'us_relationship'],
    timeHorizonYears: 10, willingnessToPay: 0.3,
    capabilities: { military: 70, missiles: 40, intel: 55, economy: 35, cohesion: 55 },
    relationships: { israel: 35, hamas: -10, usa: 40, saudi: 35, qatar: 5, iran: -20 },
    intelPenetrationByIsrael: 0.4,
    promptCore: 'الأولوية هي بقاء النظام، الاستقرار الداخلي، منع الفوضى في سيناء، حماية الحدود، تجنب تدفق سكاني واسع من غزة، والحفاظ على العلاقة مع الولايات المتحدة. العداء الشعبي لإسرائيل حقيقي، لكن الحكومة لا تريد حرباً تهدد بقاءها. يمكنها التعاون أمنياً، الضغط على حماس، أو تقييد إسرائيل وفقاً لما يخدم استقرار النظام ومكانة مصر الإقليمية.',
    decisionGuidance: STRUCT_AR,
  },
  {
    id: 'qatar', nameHe: 'קטאר', language: 'ar', leaderName: 'تميم بن حمد آل ثاني',
    priorityOrder: ['influence_via_mediation', 'us_relationship', 'political_islam_networks', 'security'],
    timeHorizonYears: 15, willingnessToPay: 0.25,
    capabilities: { military: 20, missiles: 10, intel: 40, economy: 80, cohesion: 85 },
    relationships: { israel: -10, hamas: 55, usa: 45, iran: 15, saudi: 10, egypt: 5, turkey: 45 },
    intelPenetrationByIsrael: 0.35,
    promptCore: 'نحافظ على النفوذ من خلال التحدث مع جميع الأطراف، حماية علاقتنا بالولايات المتحدة، دعم شبكات الإسلام السياسي، واستخدام الوساطة والتمويل لبناء مكانة لا يستطيع الآخرون تجاهلها. العلاقة مع حماس تمنحنا نفوذاً، وليست مجرد تعاطف. قد نضغط على حماس أو نحميها وفقاً للتهديدات التي تطال مكانتنا، أمننا، وعلاقتنا بالقوى الكبرى.',
    decisionGuidance: STRUCT_AR,
  },
  {
    id: 'saudi', nameHe: 'סעודיה', language: 'ar', leaderName: 'محمد بن سلمان',
    priorityOrder: ['regime_survival', 'economic_transformation', 'regional_status', 'contain_iran', 'us_relationship'],
    timeHorizonYears: 25, willingnessToPay: 0.3,
    capabilities: { military: 55, missiles: 45, intel: 45, economy: 80, cohesion: 70 },
    relationships: { israel: 20, iran: -30, usa: 45, egypt: 35, qatar: 10, uae: 50 },
    intelPenetrationByIsrael: 0.3,
    promptCore: 'الأولوية هي بقاء النظام، التحول الاقتصادي، المكانة الإقليمية، احتواء إيران، والحفاظ على العلاقة مع الولايات المتحدة. التطبيع مع إسرائيل أداة استراتيجية ممكنة، لكنه يتأثر بالرأي العام، القضية الفلسطينية، الضمانات الأمريكية، والفرص الإقليمية. إذا أصبحت إسرائيل عبئاً أو بدت قابلة للانهيار فقد يتغير الحساب، وإذا أثبتت قوتها وفائدتها ضد إيران فقد تتعمق الشراكة.',
    decisionGuidance: STRUCT_AR,
  },
  {
    id: 'uae', nameHe: 'איחוד האמירויות', language: 'ar', leaderName: 'محمد بن زايد',
    priorityOrder: ['stability', 'growth', 'counter_political_islam', 'economic_influence', 'practical_cooperation'],
    timeHorizonYears: 25, willingnessToPay: 0.25,
    capabilities: { military: 45, missiles: 30, intel: 50, economy: 85, cohesion: 80 },
    relationships: { israel: 55, iran: -15, usa: 50, saudi: 50, qatar: 0, egypt: 40 },
    intelPenetrationByIsrael: 0.25,
    promptCore: 'الأولوية هي الاستقرار، النمو، مواجهة الإسلام السياسي، النفوذ الاقتصادي، والتعاون العملي مع القوى القادرة على حماية النظام الإقليمي. العلاقة مع إسرائيل أصل استراتيجي يمكن الحفاظ عليه حتى في ظل ضغوط شعبية، ما دامت إسرائيل قوية ومفيدة ويمكن إدارة التكلفة الدبلوماسية.',
    decisionGuidance: STRUCT_AR,
  },
  {
    id: 'jordan', nameHe: 'ירדן', language: 'ar', leaderName: 'عبد الله الثاني',
    priorityOrder: ['regime_survival', 'border_stability', 'no_palestinian_chaos', 'us_support', 'avoid_war'],
    timeHorizonYears: 15, willingnessToPay: 0.2,
    capabilities: { military: 40, missiles: 15, intel: 45, economy: 25, cohesion: 50 },
    relationships: { israel: 30, usa: 50, pa: 30, hamas: -20, iran: -30, saudi: 30 },
    intelPenetrationByIsrael: 0.45,
    promptCore: 'الأولوية هي بقاء النظام، استقرار الحدود، منع الفوضى الفلسطينية، الحفاظ على الدعم الأمريكي، وتجنب حرب تهدد المملكة. ضعف إسرائيل الشديد قد يبدو جذاباً لبعض قطاعات الرأي العام لكنه يشكل خطراً مباشراً على استقرار الأردن. التعاون الأمني والعداء العلني يمكن أن يتعايشا.',
    decisionGuidance: STRUCT_AR,
  },
  {
    id: 'pa', nameHe: 'הרשות הפלסטינית', language: 'ar', leaderName: 'محمود عباس',
    priorityOrder: ['pa_survival', 'block_hamas', 'international_recognition', 'expand_control', 'national_project'],
    timeHorizonYears: 20, willingnessToPay: 0.3,
    capabilities: { military: 15, missiles: 0, intel: 35, economy: 15, cohesion: 30 },
    relationships: { israel: -30, hamas: -40, usa: 10, jordan: 30, qatar: 10, egypt: 20 },
    intelPenetrationByIsrael: 0.6,
    promptCore: 'الأولوية هي بقاء السلطة، منع سيطرة حماس، الحفاظ على التمويل والاعتراف الدولي، وتوسيع السيطرة السياسية الفلسطينية. الصراع مع إسرائيل يُدار بأدوات سياسية، قانونية، أمنية وشعبية إلى جانب الاحتفاظ بهدف قومي طويل المدى. التعاون الأمني قد يخدم بقاء السلطة حتى عندما لا يعني قبولاً نهائياً بإسرائيل.',
    decisionGuidance: STRUCT_AR,
  },
  {
    id: 'palestinian_publics', nameHe: 'הציבור הפלסטיני', language: 'ar', leaderName: 'الرأي العام',
    priorityOrder: ['national_struggle', 'daily_life', 'dignity'],
    timeHorizonYears: 50, willingnessToPay: 0.6,
    capabilities: { military: 10, missiles: 0, intel: 0, economy: 10, cohesion: 45 },
    relationships: { israel: -80, hamas: 30, pa: -10 },
    intelPenetrationByIsrael: 0.5,
    promptCore: 'العداء لإسرائيل متجذر أيديولوجياً وتاريخياً، ولا يختفي تلقائياً مع الازدهار الاقتصادي. النجاح المسلح يرفع التأييد والاستعداد للمواجهة، بينما الردع والفشل قد يخفضان الاستعداد العملي حتى إذا بقي الغضب والكراهية. التعليم، السيطرة السياسية، الخوف، والدعاية تغيّر درجة التطرف والقدرة على التنظيم على مدى طويل.',
    decisionGuidance: STRUCT_AR,
  },
  // ------------------------------------------------ dynamic Syria + Lebanon state
  {
    id: 'syria_regime', nameHe: 'סוריה', language: 'ar', leaderName: 'بشار الأسد',
    priorityOrder: ['regime_survival', 'territorial_control', 'allies_support', 'prevent_collapse'],
    timeHorizonYears: 10, willingnessToPay: 0.5,
    capabilities: { military: 35, missiles: 40, intel: 30, economy: 10, cohesion: 25 },
    relationships: { israel: -70, iran: 55, russia: 60, hezbollah: 55, turkey: -40, usa: -60 },
    intelPenetrationByIsrael: 0.55,
    promptCore: 'يجب إنشاء نموذج زمني متغير لسوريا، لا نموذج ثابت. قبل سقوط أي نظام تكون الأولوية بقاء النظام، السيطرة على الأرض، دعم الحلفاء، ومنع الانهيار. بعد تغير النظام يجب إعادة بناء الأهداف وفق القيادة الجديدة، علاقتها بتركيا وروسيا وإيران والغرب، قدرتها على السيطرة على الفصائل، وموقفها من إسرائيل. لا يجوز افتراض أن الدولة الجديدة ستكرر سلوك الدولة السابقة.',
    decisionGuidance: STRUCT_AR,
  },
  {
    id: 'lebanon_state', nameHe: 'ממשלת לבנון', language: 'ar', leaderName: 'الحكومة اللبنانية',
    priorityOrder: ['state_survival', 'avoid_war', 'economy', 'sovereignty'],
    timeHorizonYears: 5, willingnessToPay: 0.15,
    capabilities: { military: 20, missiles: 5, intel: 20, economy: 10, cohesion: 25 },
    relationships: { israel: -20, hezbollah: 0, usa: 30, saudi: 20, iran: -10 },
    intelPenetrationByIsrael: 0.4,
    promptCore: 'الأولوية هي بقاء الدولة اللبنانية ومنع انهيارها الكامل، تجنب حرب مدمرة، استعادة الاقتصاد، واستعادة قدر من السيادة. الدولة أضعف من حزب الله عسكرياً لكنها ليست عديمة التأثير: الشرعية، الجيش، والدعم الدولي أوراق حقيقية عندما يضعف الحزب.',
    decisionGuidance: STRUCT_AR,
  },
  // ------------------------------------------------ non-decision controllers
  {
    id: 'iraq', nameHe: 'עיראק', language: 'ar', leaderName: 'الحكومة العراقية',
    priorityOrder: ['stability'], timeHorizonYears: 5, willingnessToPay: 0.1,
    capabilities: { military: 30, missiles: 20, intel: 20, economy: 30, cohesion: 30 },
    relationships: { iran: 40, usa: 10, israel: -50 },
    intelPenetrationByIsrael: 0.3,
    promptCore: 'دولة ذات سيادة محدودة تتوازن بين النفوذ الإيراني والوجود الأمريكي.',
    decisionGuidance: STRUCT_AR,
  },
  {
    id: 'none', nameHe: '—', language: 'en', leaderName: '-',
    priorityOrder: [], timeHorizonYears: 0, willingnessToPay: 0,
    capabilities: {}, relationships: {}, intelPenetrationByIsrael: 0,
    promptCore: 'neutral / sea', decisionGuidance: '',
  },
];

export const PROMPTS_VERSION = 'prompts@1.0.0-worldview26';
