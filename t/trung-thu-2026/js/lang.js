// Language: everything the viewer reads, in Vietnamese and English, in one table.
// The viewer picks at the start screen; ?lang=vi|en opens straight into one (for the ?act= deep links, which
// skip that screen), the choice is remembered, and failing both we follow the browser.
// What is NOT here: the signs and boards painted into the scene, which stay Vietnamese in both languages
// because a Hàng Mã shopfront is in Vietnamese, and anything the sender wrote in story.json.
// Sung verse keeps its Vietnamese original and carries the English underneath as a subtitle: see `verse()`.

export const LANGS = { vi: 'Tiếng Việt', en: 'English', both: 'Cả hai · Both' };
const stored = () => { try { return localStorage.getItem('keepsake-lang'); } catch { return null; } };
const asked = new URLSearchParams(location.search).get('lang');
export let lang = LANGS[asked] ? asked : LANGS[stored()] ? stored() : navigator.language?.startsWith('vi') ? 'vi' : 'en';

export function setLang(l) {
  if (!LANGS[l]) return;
  lang = l;
  document.documentElement.lang = l;
  try { localStorage.setItem('keepsake-lang', l); } catch {}
}
const val = (v, a) => (typeof v === 'function' ? v(...a) : v);
// A hint is often two lines: the instruction, then a <br><small> aside. Pair them up line for line, so that
// "both" reads instruction · instruction · aside · aside rather than burying one language under the other.
const split = (s) => { const i = s.indexOf('<br>'); return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i)]; };
const sub = (s) => s.replace('<small>', '<small class="en">');

// t('key') · t('key', 3, 5) for the ones that count things
export function t(key, ...a) {
  const e = T[key];
  if (!e) return '';
  if (lang !== 'both') return val(e[lang] ?? e.vi, a);
  if (e.both != null) return val(e.both, a); // a few read better composed by hand
  const vi = val(e.vi, a), en = val(e.en, a);
  if (vi === en) return vi;
  // a short plain label fits on one line; anything longer, or with markup, gets the English underneath
  if (!/</.test(vi + en) && vi.length + en.length < 60) return `${vi} · ${en}`;
  const [viTop, viRest] = split(vi), [enTop, enRest] = split(en);
  return `${viTop}<br><small class="en">${enTop.replace(/^<span>[^<]*<\/span>/, '')}</small>${viRest}${sub(enRest)}`;
}
// A button's label. In "both" a pill can't take "Tiếp tục → · Continue →": the Vietnamese sits on top, the
// English small under it, and the arrow, said once, stays outside the pair.
export function label(key) {
  if (lang !== 'both') return t(key);
  const e = T[key], vi = val(e.vi, []), en = val(e.en, []);
  if (vi === en) return vi;
  const bare = (s) => s.replace(/\s*[←→]\s*/g, '');
  return `${/^←/.test(vi) ? '← ' : ''}<span class="pair">${bare(vi)}<small class="en">${bare(en)}</small></span>${/→$/.test(vi) ? ' →' : ''}`;
}
// A line of a song: the Vietnamese always stands, and carries the English under it in the other two.
export const verse = (vi, en) => (lang === 'vi' ? vi : `${vi}<br><small class="en">${en}</small>`);

const T = {
  // ---------- the page and its buttons ----------
  headerTitle: { vi: 'Trung Thu Vui Vẻ', en: 'Happy Mid-Autumn' },
  headerSub: { vi: 'Rằm tháng Tám · 2026', en: 'The fifteenth night of the eighth moon · 2026', both: 'Rằm tháng Tám · The fifteenth night of the eighth moon · 2026' },
  btnNext: { vi: 'Tiếp tục →', en: 'Continue →' },
  btnReplay: { vi: 'Xem lại', en: 'Replay' },
  btnContinue: { vi: 'Tiếp tục', en: 'Continue' },
  muteOn: { vi: 'Tắt tiếng', en: 'Mute sound' },
  muteOff: { vi: 'Bật tiếng', en: 'Unmute sound' },
  // an aria-label is read aloud, so it takes no markup
  sceneLabel: { vi: 'Câu chuyện Trung Thu. Kéo hoặc dùng phím mũi tên để nhìn quanh; nhấn Enter để tiếp tục.', en: 'Mid-Autumn story. Drag or use the arrow keys to look around; press Enter to continue.', both: 'Câu chuyện Trung Thu · Mid-Autumn story. Kéo để nhìn quanh · drag to look around.' },

  // ---------- start screen ----------
  startTo: { vi: (to) => `Gửi ${to}`, en: (to) => `For ${to}`, both: (to) => `Gửi · For ${to}` }, // no point saying the name twice
  btnBegin: { vi: 'Bắt đầu từ đầu', en: 'Start from the beginning' },
  btnChapters: { vi: 'Chọn chương', en: 'Choose a chapter' },
  btnBack: { vi: '← Quay lại', en: '← Back' },
  chapterN: { vi: (i) => `Chương ${i}`, en: (i) => `Chapter ${i}` },
  actStreet: { vi: 'Phố Hàng Mã', en: 'Hàng Mã street' },
  actStreetWhat: { vi: 'Làm đèn ông sao, nặn tò he, chọn mặt nạ', en: 'Make a star lantern, shape a tò he, pick a mask' },
  actRoof: { vi: 'Sân thượng', en: 'The rooftop' },
  actRoofWhat: { vi: 'Chó bưởi, mâm cỗ, ngắm trăng, đèn kéo quân', en: 'A pomelo dog, the tray, moon-watching, the memory lantern' },
  actParade: { vi: 'Rước đèn về sân đình', en: 'The parade to the đình' },
  actParadeWhat: { vi: 'Đèn cá chép, múa lân, nghe kể chuyện', en: 'A carp lantern, the lion dance, a story told' },
  actMoon: { vi: 'Cung trăng', en: 'The moon' },
  actMoonWhat: { vi: 'Chú Cuội, chị Hằng, Thỏ Ngọc', en: 'Chú Cuội, chị Hằng and the jade rabbit' },

  // ---------- act titles ----------
  titleRoof: {
    vi: '<p>Sân thượng nhà mình</p><h2>Rằm tháng Tám</h2>', en: '<p>Our home rooftop</p><h2>The fifteenth night</h2>',
    both: '<p>Sân thượng nhà mình · Our home rooftop</p><h2>Rằm tháng Tám</h2><p class="en">The fifteenth night</p>',
  },
  titleParade: {
    vi: '<p>Rước đèn</p><h2>Tết của thiếu nhi</h2>', en: '<p>The lantern parade</p><h2>The children’s festival</h2>',
    both: '<p>Rước đèn · The lantern parade</p><h2>Tết của thiếu nhi</h2><p class="en">The children’s festival</p>',
  },
  titleMoon: {
    vi: '<p>Cung trăng</p><h2>Nơi chú Cuội ngồi gốc cây đa</h2>', en: '<p>The moon palace</p><h2>Where Cuội sits beneath the banyan</h2>',
    both: '<p>Cung trăng · The moon palace</p><h2>Nơi chú Cuội ngồi gốc cây đa</h2><p class="en">Where Cuội sits beneath the banyan</p>',
  },

  // ---------- walking and looking ----------
  walk: {
    vi: '<span>↑</span>Vuốt lên để đi, vuốt xuống để lùi · kéo để nhìn quanh',
    en: '<span>↑</span>Swipe up to walk, down to step back · drag to look around',
  },
  lookMoon: { vi: '<small>Kéo để nhìn quanh · trăng đã lên</small>', en: '<small>Drag to look around · the moon is up</small>', both: '<small>Kéo để nhìn quanh · trăng đã lên<br><span class="en">Drag to look around · the moon is up</span></small>' },
  climb: { vi: '<span>↑</span>Cứ đi tiếp trên cầu ánh trăng…', en: '<span>↑</span>Keep climbing the bridge of moonlight…' },

  // ---------- act 1: the stalls ----------
  star1: {
    vi: '<span>✋</span>Kéo nan tre lên phía trước bàn để buộc thành hai ngôi sao<br><small>hoặc chạm vào nan · kéo chỗ khác để nhìn quanh</small>',
    en: '<span>✋</span>Drag the split bamboo up to the front of the table to tie two stars<br><small>or tap it · drag elsewhere to look around</small>',
  },
  star2: {
    vi: '<span>✋</span>Kéo giấy bóng kính đỏ hoặc xanh lên khung: các mặt dán xen kẽ đỏ với xanh<br><small>hoặc chạm vào giấy</small>',
    en: '<span>✋</span>Drag the red or green cellophane onto the frame: the facets go on red and green in turn<br><small>or tap it</small>',
  },
  star3: {
    vi: '<span>✋</span>Kéo cây nến vào lòng đèn: lắp vòng kim tuyến, tra cán rồi thắp lên<br><small>hoặc chạm vào nến</small>',
    en: '<span>✋</span>Drag the candle into the lantern: tinsel ring and handle on, and light it<br><small>or tap it</small>',
  },
  tohe1: {
    vi: '<span>✋</span>Kéo cục bột vàng lên que để nặn mình con giống<br><small>hoặc chạm vào bột · kéo chỗ khác để nhìn quanh</small>',
    en: '<span>✋</span>Drag a lump of yellow dough onto the stick for the body<br><small>or tap it · drag elsewhere to look around</small>',
  },
  tohe2: { vi: '<span>✋</span>Kéo bột cam lên làm đầu, mào đỏ và cái mỏ', en: '<span>✋</span>Drag the orange dough on for the head, the red comb and the beak' },
  tohe3: { vi: '<span>✋</span>Kéo bột xanh lên xòe ra thành đuôi', en: '<span>✋</span>Drag the green dough on to fan out the tail feathers' },
  tohe4: { vi: '<span>✋</span>Kéo bột đỏ lên làm đôi cánh và hai con mắt', en: '<span>✋</span>Drag the red dough on for the wings and the eyes' },
  maskFirst: {
    vi: '<span>✋</span>Chạm vào một chiếc mặt nạ để đeo thử<br><small>Kéo để nhìn quanh</small>',
    en: '<span>✋</span>Tap a mask to try it on<br><small>Drag to look around</small>',
  },
  maskMore: {
    vi: '<span>✋</span>Thử chiếc khác xem<br><small>hoặc chạm Tiếp tục khi đã chọn xong</small>',
    en: '<span>✋</span>Try another mask<br><small>or tap Continue when you’re done</small>',
  },
  // the mask's own line arrives already in the chosen language(s), so "both" must not double it up again
  maskWorn: {
    vi: (name, line) => `<b>${name}</b><br><small>${line}</small><br><small>Chạm để bỏ mặt nạ ra</small>`,
    en: (name, line) => `<b>${name}</b><br><small>${line}</small><br><small>Tap to take the mask off</small>`,
    both: (name, line) => `<b>${name}</b><br><small>${line}</small><br><small>Chạm để bỏ mặt nạ ra · Tap to take the mask off</small>`,
  },
  maskOngdia: { vi: 'Ông Địa bụng to, cười hề hề, dẫn đường cho đoàn lân: đất đai phì nhiêu, mùa màng no đủ.', en: 'Ông Địa, round-bellied and laughing, leads the lion: fat earth and a full harvest.' },
  maskKhi: { vi: 'Tôn Ngộ Không, Tề Thiên Đại Thánh trong Tây Du Ký: lanh lợi, gan dạ, cầm gậy như ý.', en: 'The Monkey King of Journey to the West: quick, fearless, and holding the staff that obeys him.' },
  maskHeo: { vi: 'Trư Bát Giới, sư đệ của Ngộ Không: tham ăn, hay ngủ mà rất vui tính.', en: 'Trư Bát Giới, the Monkey King’s brother-disciple: greedy and sleepy, and very good company.' },
  maskTho: { vi: 'Thỏ Ngọc, người bạn của chị Hằng, ngày đêm giã thuốc trên cung trăng.', en: 'The jade rabbit, companion to chị Hằng, pounding the elixir on the moon night and day.' },
  cake1: {
    vi: '<span>✋</span>Kéo cục bột vào lòng khuôn gỗ<br><small>hoặc chạm vào bột · kéo chỗ khác để nhìn quanh</small>',
    en: '<span>✋</span>Drag the ball of dough into the carved mould<br><small>or tap it · drag elsewhere to look around</small>',
  },
  cake2: {
    vi: '<span>✋</span>Cầm khuôn gõ xuống bàn cho chiếc bánh rơi ra<br><small>hoặc chạm vào khuôn</small>',
    en: '<span>✋</span>Pick up the mould and knock it on the table to turn the cake out<br><small>or tap it</small>',
  },
  cake3: {
    vi: '<span>✋</span>Kéo chiếc bánh lên than cho vàng<br><small>hoặc chạm vào bánh</small>',
    en: '<span>✋</span>Drag the cake onto the charcoal to bake it golden<br><small>or tap it</small>',
  },
  boat1: {
    vi: '<span>✋</span>Kéo cây nến đang cháy vào lòng thuyền, ngay dưới nồi hơi<br><small>hoặc chạm vào thuyền · kéo chỗ khác để nhìn quanh</small>',
    en: '<span>✋</span>Drag the lit candle into the boat, under its boiler<br><small>or tap the boat · drag elsewhere to look around</small>',
  },
  boat2: { vi: '<span>✋</span>Thả thuyền xuống nước<br><small>hoặc chạm vào thuyền</small>', en: '<span>✋</span>Drag the boat onto the water<br><small>or tap it</small>' },
  boatGo: { vi: '<small>Tạch tạch tạch… Nghe nó chạy kìa</small>', en: '<small>Tạch tạch tạch… listen to it go</small>', both: '<small>Tạch tạch tạch… Nghe nó chạy kìa<br><span class="en">listen to it go</span></small>' },

  // ---------- act 1: the two pavement jokes (extras.js), tapped in passing ----------
  fakerNear: { vi: '<span>✋</span>Có người đang xem ti vi trong tiệm. Chạm vào anh ấy<br><small>Hoặc cứ vuốt lên để đi tiếp</small>', en: '<span>✋</span>Someone’s watching TV in the shop. Tap him<br><small>Or just swipe up to keep walking</small>' },
  fakerWho: { vi: 'Anh xem ti vi', en: 'The man watching TV' },
  faker1: { vi: 'Mua đèn không? tôi có 6 cái', en: 'Want a lantern? I’ve got 6.' },
  traNear: { vi: '<span>✋</span>Một quán trà đá lề đường bình thường<br><small>Hoặc cứ vuốt lên để đi tiếp</small>', en: '<span>✋</span>A casual roadside tea stall<br><small>Or just swipe up to keep walking</small>' },
  traWho: { vi: 'Chú trà đá', en: 'A man at the tea stall' },
  tra1: { vi: 'Trẻ con không được hút thuốc lào đâu. Uống trà đá đi, chú mời!', en: 'No thuốc lào for kids. Have an iced tea instead, it’s on me!' },

  // ---------- act 2: the rooftop ----------
  granDog: { vi: '<b>Bà:</b> “Cháu làm con chó bưởi cho bà nhé!”', en: '<b>Grandma:</b> “Make me a pomelo dog, won’t you?”' },
  pom1: {
    vi: '<span>✋</span>Kéo con dao lên quả bưởi để khía vỏ<br><small>hoặc chạm vào quả bưởi · kéo chỗ khác để nhìn quanh</small>',
    en: '<span>✋</span>Drag the knife onto the pomelo to score the peel<br><small>or tap the pomelo · drag elsewhere to look around</small>',
  },
  pom2: {
    vi: '<span>✋</span>Kéo từng múi bưởi lên khung quả dưa và củ khoai<br><small>mỗi múi tãi ra cho xù rồi ghim bằng tăm</small>',
    en: '<span>✋</span>Drag a segment onto the melon and potato frame<br><small>each is pulled open into fluff and pinned with a toothpick</small>',
  },
  pom3: {
    vi: '<span>✋</span>Kéo hạt nhãn từ trong đĩa lên mặt con chó<br><small>hai hạt làm mắt, một miếng dưa làm mũi</small>',
    en: '<span>✋</span>Drag a longan seed from the dish onto the dog’s face<br><small>two seeds for eyes, a triangle of melon for the nose</small>',
  },
  tray: {
    vi: (done, all) => `<span>✋</span>Chạm vào chỗ đang sáng để bày mâm · ${done} / ${all}<br><small>Kéo để đi quanh cả nhà</small>`,
    en: (done, all) => `<span>✋</span>Tap a glowing spot to set the tray · ${done} / ${all}<br><small>Drag to walk round the family</small>`,
  },
  trayTiensi: { vi: '<b>Ông tiến sĩ giấy</b> ngồi giữa mâm: mong con chăm học.', en: '<b>The paper doctor</b> sits in the middle of the tray: may the child love learning.' },
  trayFruit: { vi: '<b>Mâm ngũ quả</b>: bưởi, na, hồng, cam, lựu, chuối.', en: '<b>Five kinds of fruit</b>: pomelo, custard apple, persimmon, orange, pomegranate, banana.' },
  trayCake: { vi: '<b>Bánh nướng, bánh dẻo</b>, cắt ra chia cả nhà.', en: '<b>Baked and pressed mooncakes</b>, cut and shared out round the family.' },
  trayPig: { vi: '<b>Bánh con lợn, con cá</b> cho các cháu nhỏ.', en: '<b>Little pig and fish cakes</b> for the smallest children.' },
  trayTea: { vi: '<b>Ấm trà sen</b> cho ông bà ngắm trăng.', en: '<b>A pot of lotus tea</b> for the grandparents watching the moon.' },
  moonUp: { vi: '<b>Ông:</b> “Trăng lên rồi kìa!”', en: '<b>Grandpa:</b> “There — the moon is up!”' },
  moonTap: {
    vi: '<span>✋</span>Chạm vào mặt trăng để xem màu trăng, như các cụ vẫn xem<br><small>Kéo để nhìn quanh những mái nhà</small>',
    en: '<span>✋</span>Tap the moon to read its colour, as farmers did<br><small>Drag to look around the rooftops</small>',
  },
  moonGold: { vi: '<b>Trăng vàng!</b> Năm nay được mùa tằm tơ.', en: '<b>A golden moon!</b> A good year for silk, then.' },
  keoLight: { vi: '<b>Ông</b> thắp chiếc đèn kéo quân…', en: '<b>Grandpa</b> lights the kéo quân lantern…' },
  keoTap: {
    vi: (i, n) => `<span>✋</span>Chạm vào đèn: đèn quay tới một kỷ niệm · ${i} / ${n}<br><small>Kéo để xoay quanh: bóng chạy trên tường</small>`,
    en: (i, n) => `<span>✋</span>Tap the lantern: it turns to a memory · ${i} / ${n}<br><small>Drag to turn round: the shadows run along the walls</small>`,
  },
  keoNext: { vi: 'Quay tiếp đèn →', en: 'Turn the lantern →' },
  phaCo: {
    vi: '<span>✋</span>Chạm vào đâu cũng được: <b>phá cỗ!</b><br><small>Tám giờ tối, trăng đã lên cao</small>',
    en: '<span>✋</span>Tap anywhere: <b>phá cỗ — share out the tray!</b><br><small>Eight o’clock, the moon is up</small>',
  },
  sisGo: { vi: '<b>Chị:</b> “Đi rước đèn thôi!”', en: '<b>Big sister:</b> “Come on — let’s go with the lanterns!”' },
  goParade: { vi: 'Đi rước đèn', en: 'Join the parade' },

  // ---------- act 3: the parade and the yard ----------
  carpTap: { vi: '<span>✋</span>Chạm vào chiếc đèn cá chép<br><small>Kéo để nhìn quanh đoàn rước</small>', en: '<span>✋</span>Tap the carp lantern<br><small>Drag to look around the parade</small>' },
  drumTap: {
    vi: (i, n) => `<span>🥁</span>Chạm vào trống: con lân múa theo nhịp của bạn · ${i} / ${n}<br><small>Kéo để đi quanh con lân</small>`,
    en: (i, n) => `<span>🥁</span>Tap the drum: the lion dances to your beat · ${i} / ${n}<br><small>Drag to walk round the lion</small>`,
  },
  lionLoc: { vi: '<b>Lân ăn lộc!</b>', en: '<b>The lion takes the lộc!</b>' },
  ropeFirst: {
    vi: '<span>✋</span>Chạm vào dây để đánh trống quân<br><small>thình thùng thình: mỗi tiếng trống một câu hát</small>',
    en: '<span>✋</span>Tap the rope to strike the trống quân<br><small>thình thùng thình: each stroke brings a line of the song</small>',
  },
  ropeAgain: {
    vi: (i, n, her) => `<span>✋</span>Chạm vào dây lần nữa · ${i} / ${n}<br><small>${her ? 'giờ cô gái đáp lại' : 'chàng trai hát tiếp'}</small>`,
    en: (i, n, her) => `<span>✋</span>Tap the rope again · ${i} / ${n}<br><small>${her ? 'now she answers' : 'he sings on'}</small>`,
  },
  singerHim: { vi: 'Chàng trai', en: 'The young man' },
  singerHer: { vi: 'Cô gái', en: 'The young woman' },
  tellerTap: {
    vi: '<span>✋</span>Ngồi xuống với lũ trẻ: chạm vào ông cụ kể chuyện<br><small>Kéo để nhìn quanh sân đình</small>',
    en: '<span>✋</span>Sit with the children: tap the old storyteller<br><small>Drag to look round the yard</small>',
  },
  listenOn: { vi: 'Nghe tiếp', en: 'Listen on' },
  tellerBridge: {
    vi: '<b>Ông:</b> “Pháp sư ném cây gậy lên trời, gậy hóa thành một chiếc cầu bạc…”',
    en: '<b>The old man:</b> “The magician threw his staff into the sky, and it became a bridge of silver…”',
  },

  // ---------- act 4: the moon ----------
  boardTap: {
    vi: '<span>✋</span>Chạm vào bức tranh để nghe đoạn này của câu chuyện<br><small>Kéo để nhìn quanh cung trăng</small>',
    en: '<span>✋</span>Tap the painting to hear this part of the story<br><small>Drag to look around the moon</small>',
  },
  rabbitTap: { vi: '<span>✋</span>Chạm vào Thỏ Ngọc<br><small>Kéo để ngắm tòa cung điện</small>', en: '<span>✋</span>Tap the jade rabbit<br><small>Drag to look at the palace</small>' },
  rabbitPound: { vi: '<b>Thỏ Ngọc</b> giã thuốc trường sinh: cộc, cộc, cộc…', en: '<b>The jade rabbit</b> pounds the elixir of long life: cộc, cộc, cộc…' },
  hangTap: { vi: '<span>✋</span>Chạm vào chị Hằng', en: '<span>✋</span>Tap chị Hằng' },
  danceTap: { vi: '<span>✋</span>Chạm vào các nàng tiên đang múa<br><small>Kéo để nhìn quanh</small>', en: '<span>✋</span>Tap the dancers<br><small>Drag to look around</small>' },
  dance: { vi: '<b>Khúc Nghê Thường</b>: các nàng tiên múa mỗi lúc một nhanh…', en: '<b>Khúc Nghê Thường</b>, the rainbow-skirt dance: the fairies whirl faster…' },
  cuoiTap: {
    vi: '<span>✋</span>Chạm vào chú Cuội đang ngồi dưới gốc đa<br><small>Kéo để nhìn lên tán cây</small>',
    en: '<span>✋</span>Tap chú Cuội, sitting under his banyan<br><small>Drag to look up at the tree</small>',
  },
  greetCuoi: { vi: 'Chào chú Cuội', en: 'Say hello to Cuội' },
  cuoiLeaf: {
    vi: '<b>Chú Cuội:</b> “Mỗi năm cây đa rụng một chiếc lá. Chiếc lá năm nay, chú gửi về nhà cháu.”',
    en: '<b>Chú Cuội:</b> “Each year the banyan lets fall one leaf. This year’s leaf I’m sending down to your house.”',
  },

  // ---------- the fact card ----------
  // in "both" this little label stays Vietnamese: the gloss and the full English sit right under it
  factTag: { vi: 'Góc tìm hiểu', en: 'A little more about it', both: 'Góc tìm hiểu' },
  originVn: { vi: 'Truyện cổ Việt Nam', en: 'Vietnamese folk tale' },
  originCn: { vi: 'Truyền thuyết Trung Hoa', en: 'Chinese legend' },
};
