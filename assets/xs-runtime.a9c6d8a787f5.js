window.CONFIG_BASE = {
  schemaVersion: 12,
  profile: {
    regname: "Vah",
    uid: "195645765",
    avatar: "",
    status: "Online",
    statusColor: "#57e6b1",
    pageTitle: "@Vah · xatspace",
    editProfileUrl: "https://xat.com/editme"
  },
  appearance: {
    interfaceTheme: "glass",
    preset: "custom",
    accent: "#ff63d8",
    accent2: "#6ddcff",
    pageColor: "#080a16",
    panelColor: "#111426",
    sidebarColor: "#0d1020",
    textColor: "#f7f5ff",
    mutedColor: "#a8abc2",
    borderColor: "#ffffff",
    borderOpacity: 0.10,
    panelOpacity: 0.46,
    sidebarOpacity: 0.54,
    blur: 22,
    glow: 65,
    wallpaper: "",
    wallpaperMobile: "",
    backgroundVideo: "",
    backgroundSize: "cover",
    backgroundPosition: "center center",
    overlayColor: "#050712",
    overlayOpacity: 0.44,
    ambientGlow: true,
    particles: true,
    parallax: true,
    fontScale: 1,
    desktopScale: 1,
    mobileScale: 1,
    contentMaxWidth: 1180,
    sidebarSize: 86,
    mobileDockSize: 66,
    autoDayNight: false,
    dayPreset: "pastel",
    nightPreset: "neon",
    customLayout: {
      navPosition: "left",
      navStyle: "rail",
      heroAlign: "center",
      surfaceStyle: "glass",
      cardRadius: 22,
      buttonRadius: 12,
      iconSize: 22,
      iconWeight: 1.8,
      showNavLabels: true,
      boxGap: 12,
      panelPadding: 24,
      widgetWidth: 980,
      density: "comfortable",
      shadowStrength: 55,
      headerStyle: "compact",
      tileShape: "square"
    }
  },
  motion: {
    transition: "fade",
    intensity: 0.75,
    reducedMotion: false,
    unlockAnimation: "dissolve",
    widgetAnimation: "float",
    hoverDepth: true,
    cursorGlow: true
  },
  home: {
    layout: "center",
    clock24h: true,
    showSeconds: false,
    greetingMode: "auto",
    customGreeting: "Bem-vindo de volta",
    quoteAlign: "center",
    modules: [
      {id:"greeting",enabled:true},
      {id:"status",enabled:true},
      {id:"clock",enabled:true},
      {id:"date",enabled:true},
      {id:"quote",enabled:true},
      {id:"avatar",enabled:false},
      {id:"quicklinks",enabled:false}
    ]
  },
  modules: {
    friends: true,
    gallery: true,
    music: true,
    links: true,
    notifications: true,
    focusMode: true
  },
  lockAppearance: {
    theme: "orbital",
    title: "Conecte seu padrão",
    subtitle: "Pressione um ponto, arraste pelos demais e solte para entrar.",
    kicker: "PRIVATE SPACE",
    accent: "#ff63d8",
    accent2: "#6ddcff",
    pageColor: "#080a16",
    textColor: "#f7f5ff",
    mutedColor: "#a8abc2",
    wallpaper: "",
    overlayColor: "#060713",
    overlayOpacity: 0.50,
    glow: 75,
    dotStyle: "ring",
    patternSize: 300,
    showKicker: true,
    showClear: true
  },
  access: {
    enabled: true,
    pattern: [0,3,4,7,8],
    minPoints: 4,
    maxAttempts: 5,
    lockSeconds: 15
  },
  auth: {
    apiUrl: "https://xs-m7il.onrender.com",
    requireOtp: true,
    otpLabel: "Enviar código de autenticação"
  },
  owner: {
    pattern: [],
    minPoints: 4,
    maxAttempts: 5,
    lockSeconds: 30,
    sessionMinutes: 30,
    lockOnHidden: false
  },
  quoteSettings: {
    mode: "rotate",
    intervalSeconds: 14
  },
  quotes: [
    "Tudo na vida te ensina alguma coisa.",
    "O impossível é apenas uma opinião.",
    "Colecione momentos, não pressa."
  ],
  notifications: [
    {title:"Bem-vindo",text:"Seu space está pronto.",read:false},
    {title:"Dica",text:"Explore os ícones da navegação.",read:false}
  ],
  gallery: [
    {src:"https://xatimg.com/image/iDoSy1wVoNl7.png",title:"Momento 01",caption:"",album:"Destaques"},
    {src:"https://xatimg.com/image/0e3nyxthLR66.png",title:"Momento 02",caption:"",album:"Destaques"},
    {src:"https://xatimg.com/image/fvTDbeiHAaOc.png",title:"Momento 03",caption:"",album:"Destaques"},
    {src:"https://xatimg.com/image/lrww3GNvJ9iY.jpg",title:"Momento 04",caption:"",album:"Destaques"},
    {src:"https://xatimg.com/image/i9ao4e7DL89G.png",title:"Momento 05",caption:"",album:"Destaques"},
    {src:"https://xatimg.com/image/P8Xdy32hlZHs.png",title:"Momento 06",caption:"",album:"Arquivo"},
    {src:"https://xatimg.com/image/ay8pH7ZSHMbm.png",title:"Momento 07",caption:"",album:"Arquivo"},
    {src:"https://xatimg.com/image/8tnmCEaZWiv5.png",title:"Momento 08",caption:"",album:"Arquivo"},
    {src:"https://xatimg.com/image/OmicL8kOlLSu.png",title:"Momento 09",caption:"",album:"Arquivo"},
    {src:"https://xatimg.com/image/xDz3tgJskYA3.png",title:"Momento 10",caption:"",album:"Arquivo"}
  ],
  friends: [
    {regname:"Amigo01",uid:"100001",avatar:"https://i.pravatar.cc/160?img=12",url:"https://xat.me/Amigo01"},
    {regname:"Amigo02",uid:"100002",avatar:"https://i.pravatar.cc/160?img=32",url:"https://xat.me/Amigo02"},
    {regname:"Amigo03",uid:"100003",avatar:"https://i.pravatar.cc/160?img=47",url:"https://xat.me/Amigo03"}
  ],
  links: [
    {label:"xat.com",icon:"auto",url:"https://xat.com/"},
    {label:"YouTube",icon:"auto",url:"https://youtube.com/"},
    {label:"Instagram",icon:"auto",url:"https://instagram.com/"}
  ],
  player: {
    autoplay: false,
    shuffle: false,
    repeat: "all",
    volume: 0.7,
    visualizer: true
  },
  music: [
    {title:"Neon Pulse",artist:"Demo local",cover:"",src:"./media/demo1.wav"},
    {title:"Orbit",artist:"Demo local",cover:"",src:"./media/demo2.wav"},
    {title:"Afterglow",artist:"Demo local",cover:"",src:"./media/demo3.wav"}
  ]
};
