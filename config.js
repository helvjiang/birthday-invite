/* =========================================================================
 *  配置区 —— 陛下主要改这里
 * ========================================================================= */
window.CONFIG = {

  /* 演示模式：默认按域名自动判断——
     本地预览(localhost / 127.0.0.1)自动走演示模式，数据存浏览器、不连真实库，方便您随便测不污染；
     线上(github.io 等)自动走真实库。如需强制，可改成固定 true / false。 */
  DEMO: (location.hostname === "localhost" || location.hostname === "127.0.0.1"),

  /* Supabase 项目地址与匿名密钥（在 supabase.com → 项目设置 → API 里复制）。
     演示模式下这两项被忽略。 */
  SUPABASE_URL: "https://rwphwmybocneokfamksl.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_v2GZcp9Vd6ZI3ULjWmMp8w_nlcKMhD1",

  /* 陛下后台密码：打开 admin.html 输入它才能看「谁坐了哪 / 谁送了什么」。 */
  ADMIN_PASSWORD: "19991011",

  /* 古风全局主题。某位受邀者想单独换风格，在 Supabase 的 invitations.theme
     里写一段 CSS 变量（如 "--bg:#1a1410;--red:#e8b04b;"），前端会自动套用。 */
  THEME: {
    bg:   "#f7f1e1",   // 宣纸底
    ink:  "#2c241b",   // 墨
    red:  "#9e2b25",   // 朱红
    gold: "#c9a86a",   // 描金
    font: '"KaiTi","STKaiti","Kaiti SC","Songti SC","SimSun",serif'
  },

  /* 赛博贺礼 = 花朵清单（图片取自 flower/ 目录，点一下即送出）。想加花直接往这里加一行。 */
  GIFTS: [
    { key:"balloonflower",     img:"flower/balloonflower.png",     name:"桔梗" },
    { key:"callalily",         img:"flower/callalily.png",         name:"马蹄莲" },
    { key:"camellia",          img:"flower/camellia.png",          name:"山茶花" },
    { key:"cherry",            img:"flower/cherry.png",            name:"樱花" },
    { key:"clover",            img:"flower/clover.png",            name:"三叶草" },
    { key:"gardenia",          img:"flower/gardenia.png",          name:"栀子花" },
    { key:"hyacinth",          img:"flower/hyacinth.png",          name:"风信子" },
    { key:"iris",              img:"flower/iris.png",              name:"鸢尾" },
    { key:"lily",              img:"flower/lily.png",              name:"百合" },
    { key:"lotus",             img:"flower/lotus.png",             name:"莲花" },
    { key:"marigold",          img:"flower/marigold.png",          name:"万寿菊" },
    { key:"morningglory",      img:"flower/morningglory.png",      name:"牵牛花" },
    { key:"pansy",             img:"flower/pansy.png",             name:"三色堇" },
    { key:"peach",             img:"flower/peach.png",             name:"桃花" },
    { key:"pear",              img:"flower/pear.png",              name:"梨花" },
    { key:"peony",             img:"flower/peony.png",             name:"芍药" },
    { key:"purpleloosestrife", img:"flower/purpleloosestrife.png", name:"千屈菜" },
    { key:"rainbow",           img:"flower/rainbow.png",           name:"彩虹花" },
    { key:"redbud",            img:"flower/redbud.png",            name:"紫荆" },
    { key:"spiderlily",        img:"flower/spiderlily.png",        name:"彼岸花" },
    { key:"sunflower",         img:"flower/sunflower.png",         name:"向日葵" },
    { key:"tulip",             img:"flower/tulip.png",             name:"郁金香" },
    { key:"waterhyacinth",     img:"flower/waterhyacinth.png",     name:"凤眼莲" },
    { key:"wintersweet",       img:"flower/wintersweet.png",        name:"腊梅" },
    { key:"wisteria",          img:"flower/wisteria.png",          name:"紫藤" }
  ],

  /* 爱心座位数 */
  SEAT_COUNT: 100,

  /* 背景音乐文件名（放在项目根目录） */
  BGM_FILE: "bgm.mp3"
};
