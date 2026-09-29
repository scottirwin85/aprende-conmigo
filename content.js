// content.js — all app content, kept separate from app logic.
// Add a new deck by adding a new top-level key here (name, icon, color, levels[]).
// The deck button shows a badge: DECK_BADGES[icon] in white on `color`.
// Add a level by appending {label, cards:[...]} to a deck's levels array.
// Progress is keyed by deck + the card's `es` text, so cards can be added,
// reordered or removed freely. Keep `es` unique within a deck, and note that
// editing a card's `es` text starts that card's progress over — unless you
// add was:"<old es text>" to the card, which carries its progress across.
// Words that change with gender show both forms ("orgulloso / orgullosa").
// ctx (optional): a short real-life situation for the "What would you say?"
// quiz — write it so this card's phrase is the natural thing to say.
// Add an icon by adding a key to ICONS (SVG inner-markup, viewBox 0 0 48 48, use currentColor).

const DECKS = {
  everyday: {
    name: "Everyday & Greetings",
    icon: "wave",
    color: "#1B6B78",   // deck badge colour
    levels: [
      { label: "Basics", cards: [
        {es:"¿Qué onda?", pron:"keh OHN-dah", en:"What's up? (very Mexican, casual)", ctx:"You bump into a friend in the street and want a casual “what’s up?”", why:"Literally “what wave?” — onda means wave or vibe. A casual Mexican hello; not for your boss.", icon:"wave"},
        {es:"¿Cómo amaneciste?", pron:"KOH-moh ah-mah-neh-SEES-teh", en:"How did you wake up / sleep? (caring morning greeting)", ctx:"It’s morning and your partner has just woken up. You ask how they slept.", why:"From amanecer, “to dawn”. Literally “how did you dawn?” — a warm way to ask how someone woke up.", icon:"sun"},
        {es:"Ahorita", pron:"ah-oh-REE-tah", en:"In a bit / right now (famously flexible timing)", ctx:"Someone asks when you’ll do the dishes. You mean “in a bit”.", why:"Ahora (now) + -ita (little). In Mexico it can mean right now, in a bit, or… never. The tone tells you which.", icon:"spiral"},
        {es:"Está padre", pron:"es-TAH PAH-dreh", en:"That's cool / awesome", ctx:"A friend shows you their new truck. You think it’s really cool.", why:"Padre means father, but in Mexican slang está padre means it’s cool. Muy padre = really cool.", icon:"star"},
        {es:"¿Qué tal?", pron:"keh TAHL", en:"How's it going?", ctx:"You greet a neighbour and ask how it’s going.", why:"A fixed greeting — literally “what such?”. Answer with: Bien, ¿y tú?", icon:"wave"},
        {es:"Nos vemos al rato", pron:"nohs VEH-mohs ahl RAH-toh", en:"See you in a while", ctx:"You’re heading out and will see them again later today.", why:"Nos vemos = we see each other (see you). Al rato = in a while — usually later the same day.", icon:"moon"},
        {es:"Provecho", pron:"proh-VEH-choh", en:"Enjoy your meal (said to others, even strangers)", ctx:"You walk past people eating at a restaurant and wish them a good meal.", why:"Short for buen provecho, “good benefit”. Said to anyone eating, even strangers in a restaurant.", icon:"flower"},
        {es:"Con permiso", pron:"kohn pehr-MEE-soh", en:"Excuse me (asking to pass)", ctx:"You need to squeeze past someone in a narrow hallway.", why:"Literally “with permission”. Use it to get past someone or leave the room; perdón is for after you bump into them.", icon:"leaf"},
        {es:"Órale", pron:"OH-rah-leh", en:"Wow / okay / let's go — all-purpose exclamation", why:"An all-purpose Mexican exclamation: okay!, wow!, come on! or let’s go! — the tone does the work.", icon:"star"},
        {es:"No manches", pron:"noh MAHN-chehs", en:"No way / you're kidding", ctx:"A friend tells you they just won a holiday. “No way!”", why:"Literally “don’t stain”. Mexican slang for no way! (No mames means the same but is rude.)", icon:"diamond"},
      ]},
      { label: "Conversational", cards: [
        {es:"¿Cómo te fue hoy?", pron:"KOH-moh teh FWEH oy", en:"How did it go today?", ctx:"Your partner gets home from work. You ask how their day went.", why:"Fue = it went (past of ir, to go); te = for you. Literally “how did it go for you today?”", icon:"sun"},
        {es:"Ya llegué", pron:"yah yeh-GEH", en:"I'm home / I've arrived", ctx:"You walk in the front door and let everyone know you’re home.", why:"Llegué = I arrived (llegar). Ya = already. People call it out as they walk in the door.", icon:"house"},
        {es:"¿Ya vas a cenar?", pron:"yah vahs ah seh-NAR", en:"Are you going to have dinner now?", ctx:"It’s 8pm. You want to know if your partner is going to eat dinner now.", why:"Vas a + verb = you’re going to… Cenar = to have dinner. Ya adds “now”.", icon:"flower"},
        {es:"No hay bronca", pron:"noh eye BROHN-kah", en:"No worries / no problem", ctx:"A friend apologises for being a few minutes late. “No worries.”", why:"Bronca = trouble or a fight. “There’s no trouble” = no problem. Very Mexican.", icon:"wave"},
        {es:"Échale ganas", pron:"EH-chah-leh GAH-nahs", en:"Give it your best / go for it", ctx:"Your partner is nervous before a big job interview. You encourage them.", why:"Echar = to throw; ganas = desire, effort. “Throw some effort at it” = give it your all.", icon:"star"},
        {es:"Al rato te marco", pron:"ahl RAH-toh teh MAR-koh", en:"I'll call you in a bit", ctx:"You’re busy right now but will phone them back soon.", why:"Marcar = to dial, so te marco = I’ll call you. The present tense often means the near future.", icon:"moon"},
        {es:"¿Me acompañas?", pron:"meh ah-kohm-PAH-nyahs", en:"Will you come with me?", ctx:"You want your partner to come to the shop with you.", why:"Acompañar = to go with. Me acompañas = you come with me — a rising tone makes it a question.", icon:"bird"},
        {es:"Ya casi llego", pron:"yah KAH-see YEH-goh", en:"I'm almost there", ctx:"You’re texting from the car, two minutes away.", why:"Casi = almost; llego = I arrive. The present tense for something just about to happen.", icon:"spiral"},
        {es:"Se me hizo tarde", pron:"seh meh EE-soh TAR-deh", en:"I ran late", ctx:"You arrive late to dinner and explain why.", why:"Literally “it got late on me”. The se me… form makes it something that happened to you.", icon:"moon"},
        {es:"Todo bien por acá", pron:"TOH-doh bee-EHN por ah-KAH", en:"Everything's good over here", ctx:"Your mother-in-law calls and asks how things are at your place.", why:"Acá = here — more common than aquí in Mexico. Por acá = around here.", icon:"leaf"},
      ]},
      { label: "Natural & Slang", cards: [
        {es:"Ando bien ocupado / ocupada", was:"Ando bien ocupado", pron:"AHN-doh bee-EHN oh-koo-PAH-doh / oh-koo-PAH-dah", en:"I'm pretty busy right now (ocupado if a man says it, ocupada if a woman does)", ctx:"A friend asks if you have time to chat, but you’re swamped.", why:"Andar (to walk) + an adjective = to be going around busy, tired… Here bien means “very”, not “well”.", icon:"spiral"},
        {es:"Me late", pron:"meh LAH-teh", en:"I'm into it / sounds good (Mexican slang)", ctx:"Your partner suggests a movie night and you’re into it.", why:"Latir = to beat, like a heart. Me late = it beats for me: I like it, I’m in.", icon:"star"},
        {es:"Ni modo", pron:"nee MOH-doh", en:"Oh well / nothing to be done", ctx:"You get to the restaurant and it’s closed. Oh well.", why:"Literally “not a way” — nothing to be done about it. Say it with a shrug.", icon:"leaf"},
        {es:"Aguas", pron:"AH-gwahs", en:"Watch out / be careful", ctx:"Your partner is about to step into a puddle. “Watch out!”", why:"Literally “waters!”, from people shouting before throwing water out of a window. Now: watch out!", icon:"diamond"},
        {es:"Se armó", pron:"seh ar-MOH", en:"It's on / here we go", why:"Armarse = to break out or kick off. Se armó la fiesta = the party got going.", icon:"star"},
        {es:"Está cañón", pron:"es-TAH kah-NYOHN", en:"That's tough / intense", ctx:"It’s been a really tough week at work.", why:"Cañón = canyon. Mexican slang for tough or intense: está cañón el tráfico.", icon:"diamond"},
        {es:"Neta", pron:"NEH-tah", en:"Really / seriously (truth)", ctx:"A friend says something hard to believe and you ask “seriously?”", why:"The truth. ¿Neta? = really? La neta = honestly. Very Mexican.", icon:"wave"},
        {es:"Chido", pron:"CHEE-doh", en:"Cool / awesome", why:"Mexican slang for cool, like padre. ¡Qué chido! = how cool!", icon:"star"},
        {es:"Fíjate que...", pron:"FEE-hah-teh keh", en:"So, get this... (conversational opener)", ctx:"You’re about to share some news: “So, get this…”", why:"Fijarse = to notice. Fíjate que… = “get this…” — a friendly way to start a story.", icon:"bird"},
        {es:"Ahí la llevamos", pron:"ah-EE lah yeh-VAH-mohs", en:"We're getting by / making do", ctx:"Someone asks how you’re doing, and things are just OK — getting by.", why:"Literally “there we carry it” — we’re getting by, managing.", icon:"spiral"},
      ]},
    ]
  },
  love: {
    name: "Love & Terms of Endearment",
    icon: "heart",
    color: "#6B2545",   // deck badge colour
    levels: [
      { label: "Basics", cards: [
        {es:"Mi amor", pron:"mee ah-MOR", en:"My love", why:"The most common term of endearment. Others: mi vida, mi cielo, mi corazón.", icon:"heart"},
        {es:"Te quiero mucho", pron:"teh kee-EH-roh MOO-choh", en:"I love you a lot (everyday warmth)", ctx:"Saying goodnight, you tell your partner you love them a lot.", why:"Querer = to want or love. Te quiero is warm and everyday; te amo is deeper and more romantic.", icon:"heart"},
        {es:"Te extraño", pron:"teh ehs-TRAH-nyoh", en:"I miss you", ctx:"Your partner has been away for a week. On the phone you tell them you miss them.", why:"Extrañar = to miss. Te extraño is literally “you I-miss”. In Spain they say te echo de menos.", icon:"moon"},
        {es:"Mi vida", pron:"mee VEE-dah", en:"My life (term of endearment)", why:"Literally “my life” — a very common pet name in Mexico.", icon:"sun"},
        {es:"Eres mi todo", pron:"EH-rehs mee TOH-doh", en:"You're my everything", why:"Eres = you are (ser, for who someone is). Mi todo = my everything.", icon:"star"},
        {es:"Me haces muy feliz", pron:"meh AH-sehs mwee feh-LEES", en:"You make me very happy", ctx:"After a lovely day together, you tell your partner how happy they make you.", why:"Hacer = to make; me haces = you make me. Feliz is the same for everyone.", icon:"flower"},
        {es:"Mi cielo", pron:"mee see-EH-loh", en:"My sky / darling", why:"Cielo = sky or heaven. Mi cielo = my darling.", icon:"moon"},
        {es:"Gracias por todo", pron:"GRAH-see-ahs por TOH-doh", en:"Thank you for everything", ctx:"Your partner helped you through a hard month. You thank them for everything.", why:"Gracias por = thank you for… Gracias por venir = thanks for coming.", icon:"flower"},
        {es:"Estoy orgulloso / orgullosa de ti", was:"Estoy orgulloso de ti", pron:"es-TOY or-goo-YOH-soh / or-goo-YOH-sah deh tee", en:"I'm proud of you (orgulloso if a man says it, orgullosa if a woman does)", ctx:"Your partner just got a promotion.", why:"Estar is used for how you feel right now. The ending matches the speaker: -o for a man, -a for a woman.", icon:"star"},
        {es:"Siempre juntos", pron:"see-EHM-preh HOON-tohs", en:"Always together", why:"Juntos = together (juntas if both are women).", icon:"spiral"},
      ]},
      { label: "Conversational", cards: [
        {es:"Pienso en ti todo el día", pron:"pee-EHN-soh en tee TOH-doh el DEE-ah", en:"I think about you all day", ctx:"You text your partner in the middle of a long workday.", why:"Pensar en = to think about. Pienso = I think (e becomes ie). Todo el día = all day.", icon:"heart"},
        {es:"Contigo todo es mejor", pron:"kohn-TEE-goh TOH-doh es meh-HOR", en:"Everything is better with you", why:"Contigo = with you (con + ti becomes contigo). Mejor = better.", icon:"sun"},
        {es:"Me encanta tu sonrisa", pron:"meh en-KAHN-tah too sohn-REE-sah", en:"I love your smile", ctx:"Your partner laughs at your joke and you love how they smile.", why:"Encantar works like gustar: your smile delights me. Me encantas = I adore you.", icon:"flower"},
        {es:"Eres mi persona favorita", pron:"EH-rehs mee pehr-SOH-nah fah-voh-REE-tah", en:"You're my favorite person", ctx:"Your partner asks who you’d most like to spend a lazy Sunday with.", why:"Persona is always feminine, so it’s favorita — even about a man.", icon:"star"},
        {es:"No sé qué haría sin ti", pron:"noh seh keh ah-REE-ah seen tee", en:"I don't know what I'd do without you", ctx:"Your partner just sorted out a problem you couldn’t fix yourself.", why:"Haría = I would do (the conditional of hacer). Sin ti = without you.", icon:"moon"},
        {es:"Cada día te quiero más", pron:"KAH-dah DEE-ah teh kee-EH-roh mahs", en:"I love you more every day", why:"Cada = each; más = more. The order is flexible: te quiero más cada día.", icon:"heart"},
        {es:"Eres mi mejor decisión", pron:"EH-rehs mee meh-HOR deh-see-see-OHN", en:"You're my best decision", why:"Mejor before a noun means best: mi mejor decisión = my best decision.", icon:"star"},
        {es:"Quiero envejecer contigo", pron:"kee-EH-roh en-veh-heh-SEHR kohn-TEE-goh", en:"I want to grow old with you", ctx:"Talking about the future, far down the road together.", why:"Envejecer = to grow old (from viejo, old). Quiero + verb = I want to…", icon:"spiral"},
        {es:"Me haces sentir en casa", pron:"meh AH-sehs sen-TEER en KAH-sah", en:"You make me feel at home", ctx:"Far from where you grew up, your partner makes you feel you belong.", why:"Hacer sentir = to make someone feel. En casa = at home.", icon:"house"},
        {es:"Tú eres mi paz", pron:"too EH-rehs mee pahs", en:"You are my peace", why:"Spanish usually drops tú — saying it adds emphasis: you are my peace.", icon:"leaf"},
      ]},
      { label: "Deep & Idiomatic", cards: [
        {es:"Eres mi media naranja", pron:"EH-rehs mee MEH-dee-ah nah-RAHN-hah", en:"You're my other half (lit. \"my half orange\")", why:"Media naranja = half an orange: your other half, the perfect match.", icon:"flower"},
        {es:"Contigo hasta el fin del mundo", pron:"kohn-TEE-goh AHS-tah el feen del MOON-doh", en:"With you to the end of the world", ctx:"Your partner asks if you’d follow them anywhere.", why:"Hasta = until, as far as. El fin del mundo = the end of the world.", icon:"bird"},
        {es:"Me robaste el corazón", pron:"meh roh-BAHS-teh el koh-rah-SOHN", en:"You stole my heart", ctx:"Remembering the day you fell for your partner.", why:"Robaste = you stole (past of robar). Me = from me.", icon:"heart"},
        {es:"Eres el amor de mi vida", pron:"EH-rehs el ah-MOR deh mee VEE-dah", en:"You're the love of my life", ctx:"At your wedding anniversary dinner, you tell them what they mean to you.", why:"De means “of” here: the love of my life.", icon:"star"},
        {es:"No cambiaría nada de nosotros", pron:"noh kahm-bee-ah-REE-ah NAH-dah deh noh-SOH-trohs", en:"I wouldn't change anything about us", why:"Cambiaría = I would change. No… nada (not… nothing) is normal Spanish, not a mistake.", icon:"diamond"},
        {es:"Gracias por elegirme cada día", pron:"GRAH-see-ahs por eh-leh-HEER-meh KAH-dah DEE-ah", en:"Thank you for choosing me every day", ctx:"On your anniversary, you thank your partner for choosing you again and again.", why:"Elegir = to choose. Elegirme = to choose me — me joins the end of the verb.", icon:"sun"},
        {es:"Contigo aprendí a amar de verdad", pron:"kohn-TEE-goh ah-prehn-DEE ah ah-MAR deh vehr-DAHD", en:"With you I learned to really love", why:"Aprendí = I learned. Aprender a + verb = to learn to… De verdad = for real.", icon:"heart"},
        {es:"Eres mi lugar favorito", pron:"EH-rehs mee loo-GAR fah-voh-REE-toh", en:"You're my favorite place", why:"Lugar (place) is masculine, so favorito.", icon:"house"},
        {es:"Nuestro amor es mi hogar", pron:"NWES-troh ah-MOR es mee oh-GAR", en:"Our love is my home", why:"Hogar = home as a feeling; casa = house or home.", icon:"house"},
        {es:"Para siempre y un día más", pron:"PAH-rah see-EHM-preh ee oon DEE-ah mahs", en:"Forever and a day more", why:"Para siempre = forever. Un día más = one more day.", icon:"spiral"},
      ]},
    ]
  },
  family: {
    name: "Family",
    icon: "house",
    color: "#C7832A",   // deck badge colour
    levels: [
      { label: "Basics", cards: [
        {es:"La familia", pron:"lah fah-MEE-lee-ah", en:"The family", why:"Familia is feminine: la familia, mi familia.", icon:"bird"},
        {es:"Mi esposo / Mi esposa", was:"Mi esposo", pron:"mee es-POH-soh / mee es-POH-sah", en:"My husband / My wife", why:"Esposo = husband, esposa = wife. Casually in Mexico: mi señor / mi señora, or mi viejo / mi vieja.", icon:"heart"},
        {es:"Los suegros", pron:"lohs SWEH-grohs", en:"The in-laws", why:"Suegro = father-in-law, suegra = mother-in-law; los suegros = both in-laws.", icon:"leaf"},
        {es:"El cariño", pron:"el kah-REE-nyoh", en:"Affection / fondness", why:"Cariño = affection. It’s also a pet name: ¡Hola, cariño!", icon:"heart"},
        {es:"La casa", pron:"lah KAH-sah", en:"The house / home", why:"Casa = house or home. En casa = at home.", icon:"house"},
        {es:"Extraño mi tierra", pron:"ehs-TRAH-nyoh mee tee-EH-rrah", en:"I miss my homeland", why:"Tierra = land or earth. Mi tierra = where I’m from.", icon:"leaf"},
        {es:"Mi pueblo", pron:"mee PWEH-bloh", en:"My hometown", why:"Pueblo = town or village (it can also mean a people). Mi pueblo = my hometown.", icon:"house"},
        {es:"La familia es primero", pron:"lah fah-MEE-lee-ah es pree-MEH-roh", en:"Family comes first", ctx:"You explain why you’re skipping a work event for a family birthday.", why:"Primero = first. Ser primero = to come first.", icon:"bird"},
        {es:"Bienvenido / Bienvenida a casa", was:"Bienvenido a casa", pron:"bee-ehn-veh-NEE-doh / bee-ehn-veh-NEE-dah ah KAH-sah", en:"Welcome home (bienvenido to a man, bienvenida to a woman)", ctx:"Your partner walks in after a long trip away.", why:"Bienvenido matches the person arriving: -o for a man, -a for a woman, -os for a group.", icon:"house"},
        {es:"Estamos juntos en esto", pron:"es-TAH-mohs HOON-tohs en ES-toh", en:"We're in this together", ctx:"Your partner is stressed about money. You remind them you’re a team.", why:"Estar juntos = to be together. En esto = in this.", icon:"spiral"},
      ]},
      { label: "Conversational", cards: [
        {es:"¿Cómo está tu familia?", pron:"KOH-moh es-TAH too fah-MEE-lee-ah", en:"How is your family?", ctx:"Your partner has just got off a video call with their family.", why:"Está (estar) is for how someone is doing. Tu (no accent) = your; tú = you.", icon:"bird"},
        {es:"Los extraño mucho", pron:"lohs ehs-TRAH-nyoh MOO-choh", en:"I miss them a lot", ctx:"Talking about relatives you haven’t seen in a long time.", why:"Los = them (people). Los extraño = I miss them.", icon:"moon"},
        {es:"Vamos a visitar a tus papás", pron:"VAH-mohs ah vee-see-TAR ah toos pah-PAHS", en:"Let's go visit your parents", ctx:"You suggest a trip to see your partner’s parents.", why:"In Mexico papás = parents. Spanish puts a before a person: visitar a alguien.", icon:"house"},
        {es:"Diles que los quiero", pron:"DEE-lehs keh lohs kee-EH-roh", en:"Tell them I love them", ctx:"Your partner is about to call their family. You want to send your love.", why:"Diles = tell them (di + les). Que introduces what to say.", icon:"heart"},
        {es:"Ya quiero conocer tu pueblo", pron:"yah kee-EH-roh koh-noh-SEHR too PWEH-bloh", en:"I can't wait to see your hometown", ctx:"Your partner shows you photos of their hometown.", why:"Conocer = to get to know, or visit a place for the first time. Ya quiero… = I can’t wait to…", icon:"house"},
        {es:"Aquí también tienes familia", pron:"ah-KEE tahm-bee-EHN tee-EH-nehs fah-MEE-lee-ah", en:"You have family here too", ctx:"Your partner misses their family. You remind them they have family here too.", why:"Tienes = you have (tener). También = also, too.", icon:"bird"},
        {es:"Tu casa es mi casa", pron:"too KAH-sah es mee KAH-sah", en:"Your home is my home", why:"A playful flip of the classic mi casa es tu casa (my home is your home).", icon:"house"},
        {es:"Vamos a hacer nuestra propia familia", pron:"VAH-mohs ah ah-SEHR NWES-trah PROH-pee-ah fah-MEE-lee-ah", en:"Let's build our own family", why:"Vamos a + verb = let’s… Propia = own (feminine, to match familia).", icon:"flower"},
        {es:"Siempre tendrás un lugar aquí", pron:"see-EHM-preh ten-DRAHS oon loo-GAR ah-KEE", en:"You'll always have a place here", ctx:"A cousin of your partner is leaving after a visit. You tell them they’re always welcome.", why:"Tendrás = you will have (the future of tener).", icon:"leaf"},
        {es:"Estoy feliz de ser parte de tu familia", pron:"es-TOY feh-LEES deh sehr PAR-teh deh too fah-MEE-lee-ah", en:"I'm happy to be part of your family", ctx:"At a big dinner with your in-laws, you tell them how you feel.", why:"Ser parte de = to be part of. Feliz de + verb = happy to…", icon:"star"},
      ]},
      { label: "Deep & Idiomatic", cards: [
        {es:"La distancia no borra el cariño", pron:"lah dees-TAHN-see-ah noh BOH-rrah el kah-REE-nyoh", en:"Distance doesn't erase the love", why:"Borrar = to erase: distance doesn’t erase the love.", icon:"moon"},
        {es:"Llevas tu tierra en el corazón", pron:"YEH-vahs too tee-EH-rrah en el koh-rah-SOHN", en:"You carry your homeland in your heart", why:"Llevar = to carry; llevas = you carry.", icon:"leaf"},
        {es:"Tu familia ya es mi familia", pron:"too fah-MEE-lee-ah yah es mee fah-MEE-lee-ah", en:"Your family is already my family", why:"Ya = already — here it means “now”.", icon:"heart"},
        {es:"Un día volveremos juntos a tu pueblo", pron:"oon DEE-ah vohl-veh-REH-mohs HOON-tohs ah too PWEH-bloh", en:"One day we'll go back to your hometown together", ctx:"Your partner misses their hometown. You promise a trip there together someday.", why:"Volveremos = we will return (the future of volver).", icon:"spiral"},
        {es:"Aquí construimos nuestro propio hogar", pron:"ah-KEE kohn-stroo-EE-mohs NWES-troh PROH-pee-oh oh-GAR", en:"Here we're building our own home", why:"Construimos = we build (or we built — it’s the same form). Propio matches hogar.", icon:"house"},
        {es:"Nada reemplaza estar en casa", pron:"NAH-dah reh-em-PLAH-sah es-TAR en KAH-sah", en:"Nothing replaces being home", why:"Reemplazar = to replace. A verb can work as a noun: estar en casa = being home.", icon:"house"},
        {es:"Te acompaño a donde vayas", pron:"teh ah-kohm-PAH-nyoh ah DOHN-deh VAH-yahs", en:"I'll go with you wherever you go", ctx:"Your partner is thinking about moving cities for work.", why:"Vayas is the subjunctive of ir, used because “wherever” isn’t known yet.", icon:"bird"},
        {es:"Somos familia, pase lo que pase", pron:"SOH-mohs fah-MEE-lee-ah PAH-seh loh keh PAH-seh", en:"We're family, no matter what", ctx:"After a disagreement with a relative, you remind them you’re family no matter what.", why:"Pase lo que pase = happen what may — no matter what.", icon:"diamond"},
        {es:"Tu raíz es parte de mí ahora", pron:"too rah-EES es PAR-teh deh mee ah-OH-rah", en:"Your roots are part of me now", why:"Raíz = root. Mí (with an accent) = me, after a word like de.", icon:"leaf"},
        {es:"Donde estés tú, ahí está mi hogar", pron:"DOHN-deh es-TEHS too ah-EE es-TAH mee oh-GAR", en:"Wherever you are, that's my home", ctx:"Your partner worries you’d miss your old town if you moved.", why:"Estés is the subjunctive of estar, used for “wherever”. Ahí = there.", icon:"sun"},
      ]},
    ]
  },
  food: {
    name: "Food",
    icon: "chili",
    color: "#4F7A3A",   // deck badge colour
    levels: [
      { label: "Basics", cards: [
        {es:"¿Qué se te antoja?", pron:"keh seh teh ahn-TOH-hah", en:"What are you craving?", ctx:"Deciding what to order for dinner, you ask what they’re in the mood for.", why:"Antojarse = to crave. Se te antoja = it appeals to you — the craving happens to you. Antojitos = street snacks.", icon:"flower"},
        {es:"Está delicioso", pron:"es-TAH deh-lee-see-OH-soh", en:"It's delicious", ctx:"Your partner has just cooked dinner and you take the first bite.", why:"Estar describes how food tastes right now. Also: está riquísimo.", icon:"chili"},
        {es:"Pica un poco", pron:"PEE-kah oon POH-koh", en:"It's a little spicy", ctx:"Someone asks if the salsa is spicy. It is, a bit.", why:"Picar = to sting or be spicy. ¿Pica? = is it spicy?", icon:"chili"},
        {es:"Se me hace agua la boca", pron:"seh meh AH-seh AH-gwah lah BOH-kah", en:"My mouth is watering", ctx:"You smell tacos cooking and your mouth starts watering.", why:"Literally “my mouth turns to water on me”.", icon:"wave"},
        {es:"La sobremesa", pron:"lah soh-breh-MEH-sah", en:"Time spent chatting at the table after eating", why:"Sobre (over) + mesa (table): lingering to chat after a meal. English has no word for it!", icon:"spiral"},
        {es:"Buen provecho", pron:"bwehn proh-VEH-choh", en:"Enjoy your meal", ctx:"Everyone sits down at the table. Wish them a good meal.", why:"Provecho = benefit: may the food do you good.", icon:"flower"},
        {es:"Está para chuparse los dedos", pron:"es-TAH PAH-rah choo-PAR-seh lohs DEH-dohs", en:"It's finger-licking good", why:"Chuparse = to suck (your own). Literally: it’s for licking your fingers.", icon:"star"},
        {es:"¿Ya comiste?", pron:"yah koh-MEES-teh", en:"Have you eaten yet? (common caring question)", ctx:"Your partner calls you at lunchtime. You check they’ve eaten.", why:"Comiste = you ate (past of comer). Ya = already, yet.", icon:"sun"},
        {es:"Hecho con cariño", pron:"EH-choh kohn kah-REE-nyoh", en:"Made with love", ctx:"You hand over a cake you baked yourself.", why:"Hecho = made (from hacer). With a feminine word it’s hecha: comida hecha con cariño.", icon:"heart"},
        {es:"Repetir", pron:"reh-peh-TEER", en:"To repeat — at a meal, to have seconds", why:"Repetir = to repeat. At the table, ¿quieres repetir? = do you want seconds?", icon:"spiral"},
      ]},
      { label: "Conversational", cards: [
        {es:"¿Qué vamos a cocinar hoy?", pron:"keh VAH-mohs ah koh-see-NAR oy", en:"What are we cooking today?", ctx:"It’s Sunday and you’re planning to cook together.", why:"Vamos a + verb for plans. Cocinar = to cook.", icon:"chili"},
        {es:"Se me antoja algo picante", pron:"seh meh ahn-TOH-hah AHL-goh pee-KAHN-teh", en:"I'm craving something spicy", why:"Se me antoja = I’m craving (it appeals to me). Algo = something.", icon:"chili"},
        {es:"¿Le echamos más limón?", pron:"leh eh-CHAH-mohs mahs lee-MOHN", en:"Should we add more lime?", ctx:"Tasting the guacamole, you think it needs more lime.", why:"Echar = to throw or add; le = to it. In Mexico, limón usually means lime.", icon:"leaf"},
        {es:"Está quedando muy rico", pron:"es-TAH keh-DAHN-doh mwee REE-koh", en:"This is turning out really good", why:"Quedar = to turn out; está quedando = it’s turning out. Rico = tasty (it also means rich).", icon:"star"},
        {es:"Vamos por unos tacos", pron:"VAH-mohs por OO-nohs TAH-kohs", en:"Let's go get some tacos", ctx:"Neither of you feels like cooking tonight.", why:"Ir por = to go and get. Vamos por… = let’s go get…", icon:"chili"},
        {es:"¿Ya está la salsa?", pron:"yah es-TAH lah SAHL-sah", en:"Is the salsa ready?", why:"Ya está = it’s done. ¿Ya está…? = is… ready yet?", icon:"chili"},
        {es:"Huele delicioso", pron:"WEH-leh deh-lee-see-OH-soh", en:"It smells delicious", ctx:"You walk into the kitchen while something great is cooking.", why:"Oler = to smell; huele = it smells (o becomes hue).", icon:"flower"},
        {es:"Enséñame a hacerlo", pron:"en-SEH-nyah-meh ah ah-SEHR-loh", en:"Teach me how to make it", ctx:"Your partner makes an amazing mole and you want to learn how.", why:"Enseñar = to teach. Enséñame = teach me; -lo = it. The accent keeps the stress where it was.", icon:"spiral"},
        {es:"Así lo hacía mi abuela", pron:"ah-SEE loh ah-SEE-ah mee ah-BWEH-lah", en:"That's how my grandma used to make it", why:"Hacía = used to make — the imperfect, for past habits.", icon:"house"},
        {es:"Vamos a comer como reyes", pron:"VAH-mohs ah koh-MEHR KOH-moh REH-yehs", en:"We're going to eat like kings", why:"Reyes = kings. Día de Reyes (6 January) is the Three Kings’ day.", icon:"star"},
      ]},
      { label: "Idioms & Culture", cards: [
        {es:"No hay como la comida de casa", pron:"noh eye KOH-moh lah koh-MEE-dah deh KAH-sah", en:"There's nothing like home cooking", ctx:"You’re back from a holiday of restaurant food.", why:"No hay como… = there’s nothing like…", icon:"house"},
        {es:"Cocinar es un acto de amor", pron:"koh-see-NAR es oon AHK-toh deh ah-MOR", en:"Cooking is an act of love", why:"Un acto de amor = an act of love.", icon:"heart"},
        {es:"Cada platillo cuenta una historia", pron:"KAH-dah plah-TEE-yoh KWEHN-tah OO-nah ees-TOH-ree-ah", en:"Every dish tells a story", why:"Platillo = dish (Mexican; plato elsewhere). Contar = to tell, or to count.", icon:"flower"},
        {es:"La cocina une a la familia", pron:"lah koh-SEE-nah OO-neh ah lah fah-MEE-lee-ah", en:"The kitchen brings the family together", why:"Unir = to unite. Cocina means both kitchen and cooking.", icon:"bird"},
        {es:"Comer bien es vivir bien", pron:"koh-MEHR bee-EHN es vee-VEER bee-EHN", en:"Eating well is living well", why:"Verbs used as nouns: eating well is living well.", icon:"sun"},
        {es:"Este sabor me lleva a casa", pron:"ES-teh sah-BOR meh YEH-vah ah KAH-sah", en:"This flavor takes me home", why:"Sabor = flavour. Llevar = to take someone somewhere.", icon:"house"},
        {es:"Nunca falta el chile en la mesa", pron:"NOON-kah FAHL-tah el CHEE-leh en lah MEH-sah", en:"There's always chile on the table", why:"Faltar = to be missing. Nunca falta = it’s never missing.", icon:"chili"},
        {es:"Se cocina con paciencia y cariño", pron:"seh koh-SEE-nah kohn pah-see-EHN-see-ah ee kah-REE-nyoh", en:"It's cooked with patience and love", why:"Se cocina = it’s cooked — this se means “one” or “people in general”.", icon:"heart"},
        {es:"La sazón no se aprende, se hereda", pron:"lah sah-SOHN noh seh ah-PREHN-deh seh eh-REH-dah", en:"The seasoning isn't learned, it's inherited", why:"Sazón = seasoning, a cook’s touch. Heredar = to inherit.", icon:"spiral"},
        {es:"Buen provecho y buena compañía", pron:"bwehn proh-VEH-choh ee BWEH-nah kohm-pah-NYEE-ah", en:"Good food and good company", why:"Buen goes before masculine nouns, buena before feminine ones.", icon:"flower"},
      ]},
    ]
  },
  numbers: {
    name: "Numbers & Time",
    icon: "clock",
    color: "#3F6FA8",   // deck badge colour
    levels: [
      { label: "Basics", cards: [
        {es:"Uno, dos, tres", pron:"OO-noh, dohs, trehs", en:"One, two, three", why:"Uno becomes un before a masculine noun: un taco, un día.", icon:"star"},
        {es:"Cuatro, cinco, seis", pron:"KWAH-troh, SEEN-koh, says", en:"Four, five, six", icon:"star"},
        {es:"Siete, ocho, nueve, diez", pron:"see-EH-teh, OH-choh, NWEH-veh, dee-EHS", en:"Seven, eight, nine, ten", icon:"star"},
        {es:"Veinte", pron:"VAYN-teh", en:"Twenty", why:"21–29 are one word: veintiuno, veintidós… From 31 on: treinta y uno.", icon:"star"},
        {es:"Cien", pron:"see-EHN", en:"One hundred", why:"Exactly 100 is cien; 101 and up use ciento: ciento uno.", icon:"star"},
        {es:"Hoy", pron:"oy", en:"Today", why:"The h is always silent in Spanish.", icon:"sun"},
        {es:"Mañana", pron:"mah-NYAH-nah", en:"Tomorrow (also: morning)", why:"La mañana = the morning; mañana = tomorrow. Mañana por la mañana = tomorrow morning.", icon:"sun"},
        {es:"Ayer", pron:"ah-YEHR", en:"Yesterday", icon:"moon"},
        {es:"El fin de semana", pron:"el feen deh seh-MAH-nah", en:"The weekend", why:"Literally “the end of the week”.", icon:"sun"},
        {es:"Lunes, martes, miércoles", pron:"LOO-nehs, MAR-tehs, mee-EHR-koh-lehs", en:"Monday, Tuesday, Wednesday", why:"Days aren’t capitalised in Spanish. El lunes = on Monday.", icon:"spiral"},
      ]},
      { label: "Conversational", cards: [
        {es:"¿Qué hora es?", pron:"keh OH-rah es", en:"What time is it?", ctx:"Your phone has died and you need the time.", why:"Always singular es, even though the answer is usually son las…", icon:"spiral"},
        {es:"Son las siete", pron:"sohn lahs see-EH-teh", en:"It’s seven o’clock", ctx:"Someone asks the time and it’s 7:00.", why:"Son las… for every hour except one o’clock: es la una.", icon:"spiral"},
        {es:"Es la una", pron:"es lah OO-nah", en:"It’s one o’clock", why:"Una because hora (hour) is feminine.", icon:"spiral"},
        {es:"A las ocho y media", pron:"ah lahs OH-choh ee MEH-dee-ah", en:"At half past eight", ctx:"You’re agreeing on a time to meet — 8:30.", why:"A las… = at… o’clock. Y media = and a half; y cuarto = quarter past.", icon:"spiral"},
        {es:"¿A qué hora llegas?", pron:"ah keh OH-rah YEH-gahs", en:"What time do you get here?", ctx:"You want to know when your partner will be home.", icon:"house"},
        {es:"En cinco minutos", pron:"en SEEN-koh mee-NOO-tohs", en:"In five minutes", ctx:"Someone asks when you’ll be ready. Almost there!", icon:"spiral"},
        {es:"Todos los días", pron:"TOH-dohs lohs DEE-ahs", en:"Every day", ctx:"Someone asks how often you practise Spanish.", why:"Día ends in -a but is masculine: el día, los días.", icon:"sun"},
        {es:"La semana que viene", pron:"lah seh-MAH-nah keh vee-EH-neh", en:"Next week", why:"Literally “the week that comes”. Also: la próxima semana.", icon:"spiral"},
        {es:"¿Cuánto cuesta?", pron:"KWAHN-toh KWES-tah", en:"How much does it cost?", ctx:"You’re at a market stall pointing at a bag you like.", why:"Costar = to cost; cuesta (o becomes ue).", icon:"diamond"},
        {es:"Tengo treinta años", pron:"TEN-goh TRAYN-tah AH-nyohs", en:"I’m thirty years old", why:"Spanish says “I have thirty years”. Careful: años (years) needs the ñ!", icon:"star"},
      ]},
      { label: "Natural & Slang", cards: [
        {es:"Al ratito", pron:"ahl rah-TEE-toh", en:"In a little while", why:"Rato + -ito: an even shorter “in a while”.", icon:"spiral"},
        {es:"Ahorita no", pron:"ah-oh-REE-tah noh", en:"Not right now", ctx:"Someone asks you to help move a sofa while you’re in the middle of something.", icon:"spiral"},
        {es:"Vamos tarde", pron:"VAH-mohs TAR-deh", en:"We’re running late", ctx:"You’re both still getting ready and the party started ten minutes ago.", why:"Literally “we’re going late”.", icon:"spiral"},
        {es:"¿Qué día es hoy?", pron:"keh DEE-ah es oy", en:"What day is it today?", ctx:"It’s the holidays and you’ve completely lost track of the days.", icon:"sun"},
        {es:"Pasado mañana", pron:"pah-SAH-doh mah-NYAH-nah", en:"The day after tomorrow", why:"Literally “past tomorrow”.", icon:"sun"},
        {es:"Antier", pron:"ahn-tee-EHR", en:"The day before yesterday", why:"Mexican short form of anteayer (ante + ayer).", icon:"moon"},
        {es:"De vez en cuando", pron:"deh vehs en KWAHN-doh", en:"Every now and then", ctx:"Someone asks if you ever cook Mexican food. Sometimes!", icon:"spiral"},
        {es:"A cada rato", pron:"ah KAH-dah RAH-toh", en:"All the time / constantly", why:"Literally “at every while”.", icon:"spiral"},
        {es:"Nos vemos el sábado", pron:"nohs VEH-mohs el SAH-bah-doh", en:"See you on Saturday", ctx:"You’re saying goodbye to friends you’ll see at the weekend.", why:"El sábado = on Saturday — no word for “on” needed.", icon:"sun"},
        {es:"Mañana temprano", pron:"mah-NYAH-nah tem-PRAH-noh", en:"Early tomorrow", ctx:"Someone asks when you’re leaving for the airport.", icon:"sun"},
      ]},
    ]
  },
  feelings: {
    name: "Feelings",
    icon: "smile",
    color: "#B0476B",   // deck badge colour
    levels: [
      { label: "Basics", cards: [
        {es:"Estoy feliz", pron:"es-TOY feh-LEES", en:"I’m happy", why:"Estar for how you feel right now.", icon:"sun"},
        {es:"Estoy cansado / cansada", pron:"es-TOY kahn-SAH-doh / kahn-SAH-dah", en:"I’m tired", ctx:"It’s been a long day and you can barely keep your eyes open.", why:"-o if a man says it, -a if a woman does.", icon:"moon"},
        {es:"Tengo hambre", pron:"TEN-goh AHM-breh", en:"I’m hungry", ctx:"It’s 2pm and you haven’t had lunch.", why:"Spanish says “I have hunger”. Same with sed (thirst), frío, calor, sueño.", icon:"chili"},
        {es:"Tengo sueño", pron:"TEN-goh SWEH-nyoh", en:"I’m sleepy", why:"Sueño = sleepiness, and also dream.", icon:"moon"},
        {es:"Tengo frío", pron:"TEN-goh FREE-oh", en:"I’m cold", ctx:"Someone opened the window and it’s freezing.", icon:"leaf"},
        {es:"Tengo calor", pron:"TEN-goh kah-LOR", en:"I’m hot", ctx:"It’s 35 degrees and there’s no fan.", icon:"sun"},
        {es:"Estoy triste", pron:"es-TOY TREES-teh", en:"I’m sad", icon:"moon"},
        {es:"Estoy nervioso / nerviosa", pron:"es-TOY nehr-vee-OH-soh / nehr-vee-OH-sah", en:"I’m nervous", ctx:"You’re about to meet your partner’s whole family for the first time.", icon:"spiral"},
        {es:"Me duele la cabeza", pron:"meh DWEH-leh lah kah-BEH-sah", en:"I have a headache", why:"Doler works like gustar: “the head hurts me”. Me duele el estómago = my stomach hurts.", icon:"diamond"},
        {es:"Estoy bien", pron:"es-TOY bee-EHN", en:"I’m fine", icon:"leaf"},
      ]},
      { label: "Conversational", cards: [
        {es:"¿Cómo te sientes?", pron:"KOH-moh teh see-EN-tehs", en:"How are you feeling?", ctx:"Your partner has been ill for a couple of days.", why:"Sentirse = to feel (e becomes ie).", icon:"heart"},
        {es:"Me siento mejor", pron:"meh see-EN-toh meh-HOR", en:"I feel better", ctx:"You were sick yesterday, but today you’re better.", icon:"sun"},
        {es:"¿Estás enojado / enojada?", pron:"es-TAHS eh-noh-HAH-doh / eh-noh-HAH-dah", en:"Are you angry?", why:"Enojado is the Mexican word; in Spain they say enfadado. Match the ending to the person you ask.", icon:"chili"},
        {es:"No te preocupes", pron:"noh teh preh-oh-KOO-pehs", en:"Don’t worry", ctx:"Your partner is panicking about something small.", why:"Preocupes is the subjunctive, used in “don’t…” commands.", icon:"leaf"},
        {es:"Estoy de buenas", pron:"es-TOY deh BWEH-nahs", en:"I’m in a good mood", icon:"sun"},
        {es:"Estoy de malas", pron:"es-TOY deh MAH-lahs", en:"I’m in a bad mood", ctx:"Nothing has gone right today and you want to warn people.", icon:"moon"},
        {es:"Me da mucho gusto", pron:"meh dah MOO-choh GOOS-toh", en:"I’m really glad", ctx:"An old friend tells you they’re getting married.", why:"Literally “it gives me a lot of pleasure”.", icon:"flower"},
        {es:"Me da pena", pron:"meh dah PEH-nah", en:"I’m embarrassed / I feel shy", why:"In Mexico pena usually means embarrassment; elsewhere it means sorrow.", icon:"flower"},
        {es:"¡Qué emoción!", pron:"keh eh-moh-see-OHN", en:"How exciting!", ctx:"Your partner tells you you’re going to Mexico next month.", icon:"star"},
        {es:"Necesito un abrazo", pron:"neh-seh-SEE-toh oon ah-BRAH-soh", en:"I need a hug", ctx:"It’s been a really rough day.", icon:"heart"},
      ]},
      { label: "Natural & Slang", cards: [
        {es:"Ando de malas", pron:"AHN-doh deh MAH-lahs", en:"I’ve been in a bad mood", why:"Andar instead of estar suggests it’s been going on for a while.", icon:"moon"},
        {es:"Me cae bien", pron:"meh KAH-eh bee-EHN", en:"I like him / her (as a person)", ctx:"Your partner asks what you think of their new coworker. You like them.", why:"Caer = to fall. Use it for liking people; gustar can sound romantic.", icon:"heart"},
        {es:"Me cae gordo", pron:"meh KAH-eh GOR-doh", en:"I can’t stand him / her", why:"Mexican slang — literally “he falls fat on me”.", icon:"chili"},
        {es:"¡Qué coraje!", pron:"keh koh-RAH-heh", en:"How infuriating!", ctx:"The bus drove straight past you in the rain.", why:"In Mexico coraje means anger (elsewhere, courage).", icon:"chili"},
        {es:"Estoy harto / harta", pron:"es-TOY AR-toh / AR-tah", en:"I’m fed up", why:"Harto = full, sick of it. Estoy harto de… = I’m sick of…", icon:"diamond"},
        {es:"Se me hizo un nudo en la garganta", pron:"seh meh EE-soh oon NOO-doh en lah gar-GAHN-tah", en:"I got a lump in my throat", ctx:"Your partner’s grandmother gives you a present she made by hand.", icon:"heart"},
        {es:"No me la creo", pron:"noh meh lah KREH-oh", en:"I can’t believe it (in a good way)", icon:"star"},
        {es:"Me vale", pron:"meh VAH-leh", en:"I don’t care", why:"Casual and a bit rude — use it with friends, not in-laws.", icon:"leaf"},
        {es:"Échame porras", pron:"EH-chah-meh POH-rrahs", en:"Cheer me on / Root for me", ctx:"You’re about to go into a big job interview.", why:"Porras = cheers, like at a match.", icon:"star"},
        {es:"Me siento en las nubes", pron:"meh see-EN-toh en lahs NOO-behs", en:"I’m on cloud nine", why:"Literally “I feel in the clouds”.", icon:"bird"},
      ]},
    ]
  },
  home: {
    name: "Around the House",
    icon: "sofa",
    color: "#5E6E7E",   // deck badge colour
    levels: [
      { label: "Basics", cards: [
        {es:"La cocina", pron:"lah koh-SEE-nah", en:"The kitchen", icon:"house"},
        {es:"El baño", pron:"el BAH-nyoh", en:"The bathroom", icon:"house"},
        {es:"La recámara", pron:"lah reh-KAH-mah-rah", en:"The bedroom", why:"The Mexican word; elsewhere el dormitorio or la habitación.", icon:"moon"},
        {es:"La sala", pron:"lah SAH-lah", en:"The living room", icon:"house"},
        {es:"La puerta", pron:"lah PWEHR-tah", en:"The door", icon:"house"},
        {es:"Las llaves", pron:"lahs YAH-vehs", en:"The keys", why:"Llave also means tap (faucet) in Mexico.", icon:"diamond"},
        {es:"La cama", pron:"lah KAH-mah", en:"The bed", icon:"moon"},
        {es:"La ventana", pron:"lah ven-TAH-nah", en:"The window", icon:"sun"},
        {es:"El refri", pron:"el REH-free", en:"The fridge", why:"Short for el refrigerador.", icon:"leaf"},
        {es:"La tele", pron:"lah TEH-leh", en:"The TV", why:"Short for la televisión.", icon:"star"},
      ]},
      { label: "Conversational", cards: [
        {es:"¿Dónde están las llaves?", pron:"DOHN-deh es-TAHN lahs YAH-vehs", en:"Where are the keys?", ctx:"You’re about to leave and can’t find the keys anywhere.", why:"Estar for where things are.", icon:"diamond"},
        {es:"Apaga la luz", pron:"ah-PAH-gah lah loos", en:"Turn off the light", ctx:"You’re in bed and the hallway light is still on.", icon:"moon"},
        {es:"Prende la tele", pron:"PREN-deh lah TEH-leh", en:"Turn on the TV", why:"Prender is Mexican for “turn on”; encender elsewhere.", icon:"star"},
        {es:"Cierra la puerta", pron:"see-EH-rrah lah PWEHR-tah", en:"Close the door", ctx:"There’s a cold draught coming in.", icon:"house"},
        {es:"Voy a bañarme", pron:"voy ah bah-NYAR-meh", en:"I’m going to shower", why:"In Mexico bañarse usually means to shower.", icon:"leaf"},
        {es:"Hay que lavar los trastes", pron:"eye keh lah-VAR lohs TRAHS-tehs", en:"The dishes need washing", ctx:"After dinner there’s a pile of dirty plates.", why:"Hay que + verb = it needs doing. Trastes = dishes (Mexican).", icon:"leaf"},
        {es:"Yo saco la basura", pron:"yoh SAH-koh lah bah-SOO-rah", en:"I’ll take out the rubbish", ctx:"The bin is full and you offer to deal with it.", icon:"leaf"},
        {es:"¿Pongo la mesa?", pron:"POHN-goh lah MEH-sah", en:"Shall I set the table?", ctx:"Dinner is nearly ready and you want to help.", icon:"flower"},
        {es:"Tiende la cama", pron:"tee-EN-deh lah KAH-mah", en:"Make the bed", why:"Tender = to spread out, so tender la cama = to make the bed.", icon:"moon"},
        {es:"Hace frío aquí", pron:"AH-seh FREE-oh ah-KEE", en:"It’s cold in here", why:"Hace for weather: hace frío, hace calor. Tengo frío is about you.", icon:"leaf"},
      ]},
      { label: "Natural & Slang", cards: [
        {es:"Échale un ojo a la estufa", pron:"EH-chah-leh oon OH-hoh ah lah es-TOO-fah", en:"Keep an eye on the stove", ctx:"You need to leave the kitchen while the beans are cooking.", why:"Echar un ojo = to throw an eye: keep watch.", icon:"chili"},
        {es:"Se fue la luz", pron:"seh fweh lah loos", en:"The power’s gone out", ctx:"Suddenly everything goes dark during a storm.", why:"Literally “the light left”.", icon:"moon"},
        {es:"¿Quién se acabó la leche?", pron:"kee-EHN seh ah-kah-BOH lah LEH-cheh", en:"Who finished the milk?", ctx:"You open the fridge for your coffee and the carton is empty.", icon:"leaf"},
        {es:"Está todo tirado", pron:"es-TAH TOH-doh tee-RAH-doh", en:"Everything’s lying around", why:"Tirado = thrown down. Also means lying down, exhausted.", icon:"spiral"},
        {es:"Vamos a arreglar la casa", pron:"VAH-mohs ah ah-rreh-GLAR lah KAH-sah", en:"Let’s tidy the house", ctx:"Visitors are coming in an hour.", icon:"house"},
        {es:"Me toca lavar", pron:"meh TOH-kah lah-VAR", en:"It’s my turn to wash up", why:"Tocarle a alguien = to be someone’s turn: te toca = it’s your turn.", icon:"leaf"},
        {es:"Te toca a ti", pron:"teh TOH-kah ah tee", en:"It’s your turn", ctx:"You did the dishes yesterday. Today it’s your partner’s turn.", icon:"leaf"},
        {es:"Quítate los zapatos", pron:"KEE-tah-teh lohs sah-PAH-tohs", en:"Take your shoes off", icon:"house"},
        {es:"Ponte cómodo / cómoda", pron:"POHN-teh KOH-moh-doh / KOH-moh-dah", en:"Make yourself comfortable", why:"-o to a man, -a to a woman.", icon:"house"},
        {es:"Hogar, dulce hogar", pron:"oh-GAR, DOOL-seh oh-GAR", en:"Home sweet home", ctx:"You walk in the door after two weeks away.", icon:"heart"},
      ]},
    ]
  },
  outabout: {
    name: "Out & About",
    icon: "pin",
    color: "#7A5AA6",   // deck badge colour
    levels: [
      { label: "Basics", cards: [
        {es:"¿Dónde está el baño?", pron:"DOHN-deh es-TAH el BAH-nyoh", en:"Where’s the bathroom?", ctx:"You’re at a restaurant and need the toilet.", icon:"house"},
        {es:"La cuenta, por favor", pron:"lah KWEN-tah, por fah-VOR", en:"The bill, please", ctx:"You’ve finished eating and want to pay.", icon:"diamond"},
        {es:"¿Cuánto es?", pron:"KWAHN-toh es", en:"How much is it?", icon:"diamond"},
        {es:"A la derecha", pron:"ah lah deh-REH-chah", en:"To the right", why:"Derecha = right; derecho = straight.", icon:"wave"},
        {es:"A la izquierda", pron:"ah lah ees-kee-EHR-dah", en:"To the left", icon:"wave"},
        {es:"Todo derecho", pron:"TOH-doh deh-REH-choh", en:"Straight ahead", icon:"wave"},
        {es:"Aquí está bien", pron:"ah-KEE es-TAH bee-EHN", en:"Here is fine", ctx:"You’re in a taxi and you’ve reached your street.", icon:"house"},
        {es:"Disculpe", pron:"dees-KOOL-peh", en:"Excuse me (to a stranger)", why:"The polite form (usted); to a friend: disculpa.", icon:"flower"},
        {es:"Una mesa para dos", pron:"OO-nah MEH-sah PAH-rah dohs", en:"A table for two", ctx:"You walk into a restaurant with your partner.", icon:"flower"},
        {es:"¿Aceptan tarjeta?", pron:"ah-SEP-tahn tar-HEH-tah", en:"Do you take cards?", ctx:"You’ve got no cash on you.", icon:"diamond"},
      ]},
      { label: "Conversational", cards: [
        {es:"¿Me da uno, por favor?", pron:"meh dah OO-noh, por fah-VOR", en:"Can I have one, please?", why:"Literally “do you give me one?” — the usual polite way to order.", icon:"star"},
        {es:"¿Me lo envuelve?", pron:"meh loh en-VWEL-veh", en:"Could you wrap it for me?", ctx:"You’ve bought a present for your mother-in-law.", icon:"star"},
        {es:"¿Está lejos?", pron:"es-TAH LEH-hohs", en:"Is it far?", ctx:"Someone gives you directions and you wonder if you can walk it.", icon:"wave"},
        {es:"Queda a dos cuadras", pron:"KEH-dah ah dohs KWAH-drahs", en:"It’s two blocks away", why:"Quedar = to be located. Cuadra = a city block.", icon:"wave"},
        {es:"¿Me puede ayudar?", pron:"meh PWEH-deh ah-yoo-DAR", en:"Can you help me?", ctx:"You’re lost and stop a stranger.", icon:"flower"},
        {es:"Nada más estoy viendo", pron:"NAH-dah mahs es-TOY vee-EN-doh", en:"I’m just looking", ctx:"A shop assistant asks if you need help.", icon:"star"},
        {es:"¿Tiene uno más grande?", pron:"tee-EH-neh OO-noh mahs GRAHN-deh", en:"Do you have a bigger one?", icon:"star"},
        {es:"Para llevar", pron:"PAH-rah yeh-VAR", en:"To go / takeaway", ctx:"The taquero asks if you’re eating there.", icon:"chili"},
        {es:"Aquí en la esquina, por favor", pron:"ah-KEE en lah es-KEE-nah, por fah-VOR", en:"Here on the corner, please", icon:"wave"},
        {es:"¿Cuánto le debo?", pron:"KWAHN-toh leh DEH-boh", en:"What do I owe you?", why:"Deber = to owe. Le = to you (polite).", icon:"diamond"},
      ]},
      { label: "Natural & Slang", cards: [
        {es:"¿Me hace el favor?", pron:"meh AH-seh el fah-VOR", en:"Would you do me a favour?", icon:"flower"},
        {es:"¡Bajan!", pron:"BAH-hahn", en:"Getting off! (on a bus)", ctx:"Your stop is coming up on a crowded Mexican bus.", why:"Literally “they’re getting off” — shouted to the driver.", icon:"wave"},
        {es:"¿Hay lugar?", pron:"eye loo-GAR", en:"Is there room?", ctx:"You’re looking for a seat in a busy café.", icon:"house"},
        {es:"Ahí se ven", pron:"ah-EE seh vehn", en:"See you (all) around", icon:"wave"},
        {es:"Está a la vuelta", pron:"es-TAH ah lah VWEL-tah", en:"It’s just around the corner", icon:"wave"},
        {es:"¿Me regala un vaso de agua?", pron:"meh reh-GAH-lah oon VAH-soh deh AH-gwah", en:"Could I have a glass of water?", why:"Regalar = to give as a present. Very polite Mexican — you still pay for things you order!", icon:"leaf"},
        {es:"Quédese con el cambio", pron:"KEH-deh-seh kohn el KAHM-bee-oh", en:"Keep the change", ctx:"The taxi fare was 95 and you hand over 100.", icon:"diamond"},
        {es:"Joven, ¿me trae la cuenta?", pron:"HOH-ven, meh TRAH-eh lah KWEN-tah", en:"Excuse me, could you bring the bill?", why:"Joven (young one) is how you call a waiter in Mexico, whatever their age.", icon:"diamond"},
        {es:"Hay mucho tráfico", pron:"eye MOO-choh TRAH-fee-koh", en:"There’s a lot of traffic", icon:"wave"},
        {es:"¡Vámonos!", pron:"VAH-moh-nohs", en:"Let’s go!", ctx:"Everyone’s finally ready and it’s time to leave.", why:"From vamos + nos: let’s get ourselves going.", icon:"wave"},
      ]},
    ]
  },
  texting: {
    name: "Texting & Slang",
    icon: "phone",
    color: "#D0673A",   // deck badge colour
    levels: [
      { label: "Basics", cards: [
        {es:"jaja", pron:"HAH-hah", en:"haha", why:"J sounds like a breathy h, so Spanish laughs in j: jajaja.", icon:"star"},
        {es:"xfa", pron:"(por favor) por fah-VOR", en:"pls — short for por favor", icon:"star"},
        {es:"q onda", pron:"(qué onda) keh OHN-dah", en:"wassup — short for ¿qué onda?", icon:"wave"},
        {es:"ntp", pron:"(no te preocupes) noh teh preh-oh-KOO-pehs", en:"np — short for no te preocupes", icon:"leaf"},
        {es:"tqm", pron:"(te quiero mucho) teh kee-EH-roh MOO-choh", en:"love you lots — short for te quiero mucho", icon:"heart"},
        {es:"bn", pron:"(bien) bee-EHN", en:"good / fine — short for bien", icon:"star"},
        {es:"xq", pron:"(porque) POR-keh", en:"because / why — short for porque or ¿por qué?", why:"Porque = because; ¿por qué? = why? The x stands for “por”, like times.", icon:"spiral"},
        {es:"k", pron:"(que / qué) keh", en:"what / that", icon:"star"},
        {es:"va", pron:"vah", en:"ok, sounds good", why:"From vale / va bien. Very Mexican.", icon:"star"},
        {es:"bss", pron:"(besos) BEH-sohs", en:"kisses (xx)", icon:"heart"},
      ]},
      { label: "Conversational", cards: [
        {es:"¿Ya vienes?", pron:"yah vee-EH-nehs", en:"Are you on your way?", ctx:"Your partner was meant to leave work ten minutes ago.", icon:"wave"},
        {es:"Voy en camino", pron:"voy en kah-MEE-noh", en:"I’m on my way", ctx:"You’ve just left and they’re waiting for you.", icon:"wave"},
        {es:"Llego en 5", pron:"YEH-goh en SEEN-koh", en:"Be there in 5", icon:"spiral"},
        {es:"¿Me marcas?", pron:"meh MAR-kahs", en:"Can you call me?", ctx:"Texting is too slow for what you need to say.", icon:"wave"},
        {es:"¿Dónde andas?", pron:"DOHN-deh AHN-dahs", en:"Where are you?", why:"Andar makes it casual: “where are you wandering?”", icon:"wave"},
        {es:"Ya salí", pron:"yah sah-LEE", en:"I’ve left", why:"Salí = I went out (past of salir).", icon:"wave"},
        {es:"Sale", pron:"SAH-leh", en:"OK / deal", ctx:"A friend texts: “Tacos at 8?” You’re in.", why:"Mexican yes-that-works. Literally “it comes out”.", icon:"star"},
        {es:"Mándame foto", pron:"MAHN-dah-meh FOH-toh", en:"Send me a photo", icon:"star"},
        {es:"Buenas noches, que descanses", pron:"BWEH-nahs NOH-chehs, keh des-KAHN-sehs", en:"Good night, sleep well", ctx:"Your last text of the day to your partner.", why:"Que + subjunctive = may you…: que descanses = may you rest.", icon:"moon"},
        {es:"Te mando un beso", pron:"teh MAHN-doh oon BEH-soh", en:"Sending you a kiss", icon:"heart"},
      ]},
      { label: "Natural & Slang", cards: [
        {es:"¡Qué oso!", pron:"keh OH-soh", en:"How embarrassing!", ctx:"You just waved at a stranger thinking it was your friend.", why:"Oso = bear. Hacer el oso = to make a fool of yourself (Mexican).", icon:"diamond"},
        {es:"Está de pelos", pron:"es-TAH deh PEH-lohs", en:"It’s awesome", why:"Literally “it’s of hairs” — Mexican slang for excellent.", icon:"star"},
        {es:"Me cae que sí", pron:"meh KAH-eh keh see", en:"I swear it’s true", why:"Mexican slang, short for “may lightning strike me if not”.", icon:"star"},
        {es:"¡Qué flojera!", pron:"keh floh-HEH-rah", en:"Ugh, I can’t be bothered", ctx:"It’s Sunday morning and you have to go grocery shopping.", why:"Flojo = lazy. Tengo flojera = I feel lazy.", icon:"moon"},
        {es:"Güey", pron:"way", en:"Dude", why:"Very casual — only with close friends. You’ll hear it constantly in Mexico.", icon:"wave"},
        {es:"Simón", pron:"see-MOHN", en:"Yeah (playful yes)", why:"A jokey Mexican sí.", icon:"star"},
        {es:"Nel", pron:"nel", en:"Nope", why:"A jokey Mexican no.", icon:"star"},
        {es:"Ya valió", pron:"yah vah-lee-OH", en:"It’s ruined / Game over", ctx:"You dropped the birthday cake on the floor.", icon:"diamond"},
        {es:"¡Qué buena onda!", pron:"keh BWEH-nah OHN-dah", en:"That’s so nice of you!", ctx:"A friend offers to drive you to the airport at 5am.", why:"Buena onda = good vibes. Es buena onda = he / she is a nice person.", icon:"flower"},
        {es:"Al chile", pron:"ahl CHEE-leh", en:"Honestly / No joke", why:"Mexican slang: telling it straight, as bare as a chilli. Casual — friends only.", icon:"chili"},
      ]},
    ]
  },
  inlaws: {
    name: "Meeting the Family",
    icon: "people",
    color: "#3E8E7E",   // deck badge colour
    levels: [
      { label: "Basics", cards: [
        {es:"Mucho gusto", pron:"MOO-choh GOOS-toh", en:"Nice to meet you", ctx:"You shake hands with your partner’s uncle for the first time.", why:"Literally “much pleasure”.", icon:"flower"},
        {es:"Encantado / Encantada", pron:"en-kahn-TAH-doh / en-kahn-TAH-dah", en:"Delighted to meet you", why:"-o if a man says it, -a if a woman does.", icon:"flower"},
        {es:"Buenas tardes, señora", pron:"BWEH-nahs TAR-dehs, seh-NYOH-rah", en:"Good afternoon, ma’am", ctx:"You arrive at your in-laws’ house at 4pm and greet your partner’s mother.", icon:"sun"},
        {es:"Gracias por invitarme", pron:"GRAH-see-ahs por een-vee-TAR-meh", en:"Thanks for having me", ctx:"You’re welcomed into your in-laws’ home for dinner.", icon:"flower"},
        {es:"¿Cómo está usted?", pron:"KOH-moh es-TAH oos-TEHD", en:"How are you? (polite)", why:"Usted is the polite “you” for elders and in-laws; it takes the él / ella verb form.", icon:"wave"},
        {es:"Qué bonita casa", pron:"keh boh-NEE-tah KAH-sah", en:"What a lovely home", ctx:"You step into your in-laws’ house for the first time.", icon:"house"},
        {es:"Todo estuvo delicioso", pron:"TOH-doh es-TOO-voh deh-lee-see-OH-soh", en:"Everything was delicious", ctx:"The meal is over and you want to thank the cook.", why:"Estuvo = it was (past of estar), for the finished meal.", icon:"chili"},
        {es:"Con mucho gusto", pron:"kohn MOO-choh GOOS-toh", en:"With pleasure / You’re welcome", icon:"flower"},
        {es:"Mi suegra", pron:"mee SWEH-grah", en:"My mother-in-law", icon:"heart"},
        {es:"Mi suegro", pron:"mee SWEH-groh", en:"My father-in-law", icon:"heart"},
      ]},
      { label: "Conversational", cards: [
        {es:"Le traje algo", pron:"leh TRAH-heh AHL-goh", en:"I brought you something", ctx:"You hand your mother-in-law a bunch of flowers.", why:"Traje = I brought (past of traer). Le = to you (polite).", icon:"star"},
        {es:"¿Le ayudo con algo?", pron:"leh ah-YOO-doh kohn AHL-goh", en:"Can I help you with anything?", ctx:"Your mother-in-law is busy in the kitchen.", icon:"flower"},
        {es:"Estoy aprendiendo español", pron:"es-TOY ah-pren-dee-EN-doh es-pah-NYOHL", en:"I’m learning Spanish", ctx:"Someone compliments your Spanish.", icon:"star"},
        {es:"Más despacio, por favor", pron:"mahs des-PAH-see-oh, por fah-VOR", en:"Slower, please", ctx:"Your father-in-law is talking so fast you can’t keep up.", icon:"spiral"},
        {es:"¿Cómo se dice…?", pron:"KOH-moh seh DEE-seh", en:"How do you say…?", why:"Se dice = one says. ¿Cómo se dice “fork”?", icon:"wave"},
        {es:"No entendí", pron:"noh en-ten-DEE", en:"I didn’t understand", ctx:"Everyone laughs at a joke you didn’t catch.", icon:"spiral"},
        {es:"¿Me enseña la receta?", pron:"meh en-SEH-nyah lah reh-SEH-tah", en:"Would you teach me the recipe?", ctx:"Your mother-in-law’s mole is the best thing you’ve ever eaten.", icon:"chili"},
        {es:"Ya me siento en familia", pron:"yah meh see-EN-toh en fah-MEE-lee-ah", en:"I already feel like family", icon:"heart"},
        {es:"¡Salud!", pron:"sah-LOOD", en:"Cheers!", ctx:"Everyone raises their glass at dinner.", why:"Salud = health. Also said when someone sneezes.", icon:"star"},
        {es:"Provecho a todos", pron:"proh-VEH-choh ah TOH-dohs", en:"Enjoy your meal, everyone", icon:"flower"},
      ]},
      { label: "Natural & Slang", cards: [
        {es:"Pásele, está en su casa", pron:"PAH-seh-leh, es-TAH en soo KAH-sah", en:"Come in, make yourself at home", why:"What you’ll hear at the door. Pásele = come in (polite Mexican).", icon:"house"},
        {es:"Que les vaya bien", pron:"keh lehs VAH-yah bee-EHN", en:"Take care, all of you", ctx:"You’re leaving and saying goodbye to the whole family.", why:"Literally “may it go well for you all”.", icon:"wave"},
        {es:"Estuvo muy a gusto", pron:"es-TOO-voh mwee ah GOOS-toh", en:"That was really lovely", why:"A gusto = comfortable, relaxed, enjoyable.", icon:"sun"},
        {es:"Me quedé con ganas de más", pron:"meh keh-DEH kohn GAH-nahs deh mahs", en:"I was left wanting more", icon:"chili"},
        {es:"Gracias por recibirme", pron:"GRAH-see-ahs por reh-see-BEER-meh", en:"Thank you for welcoming me", why:"Recibir = to receive, to welcome.", icon:"flower"},
        {es:"¿Quieren que traiga algo?", pron:"kee-EH-rehn keh TRY-gah AHL-goh", en:"Do you want me to bring anything?", ctx:"You’re invited to a family barbecue on Sunday.", why:"Traiga is the subjunctive of traer, used after querer que…", icon:"star"},
        {es:"A sus órdenes", pron:"ah soos OR-deh-nehs", en:"At your service", why:"A very polite Mexican reply to thanks, or when introducing yourself.", icon:"flower"},
        {es:"Que Dios se lo pague", pron:"keh dee-OHS seh loh PAH-geh", en:"Bless you for it (heartfelt thanks)", why:"Literally “may God repay you”. You’ll hear it from older relatives.", icon:"heart"},
        {es:"Ya son de la familia", pron:"yah sohn deh lah fah-MEE-lee-ah", en:"You’re family now", icon:"heart"},
        {es:"Como en su casa", pron:"KOH-moh en soo KAH-sah", en:"Just like at home", icon:"house"},
      ]},
    ]
  },
  celebrations: {
    name: "Celebrations",
    icon: "party",
    color: "#C23B3B",   // deck badge colour
    levels: [
      { label: "Basics", cards: [
        {es:"Feliz cumpleaños", pron:"feh-LEES koom-pleh-AH-nyohs", en:"Happy birthday", ctx:"It’s your mother-in-law’s birthday.", why:"Cumplir años = to complete years.", icon:"star"},
        {es:"Feliz Navidad", pron:"feh-LEES nah-vee-DAHD", en:"Merry Christmas", icon:"star"},
        {es:"Feliz Año Nuevo", pron:"feh-LEES AH-nyoh NWEH-voh", en:"Happy New Year", ctx:"The clock has just struck midnight on 31 December.", icon:"star"},
        {es:"El pastel", pron:"el pahs-TEL", en:"The cake", icon:"flower"},
        {es:"Las mañanitas", pron:"lahs mah-nyah-NEE-tahs", en:"The Mexican birthday song", why:"Traditionally sung first thing in the morning — mañanitas = little mornings.", icon:"sun"},
        {es:"Día de Muertos", pron:"DEE-ah deh MWEHR-tohs", en:"Day of the Dead (1–2 November)", why:"A joyful remembrance of loved ones who have died, not a sad day.", icon:"flower"},
        {es:"La ofrenda", pron:"lah oh-FREN-dah", en:"The altar for loved ones who have died", why:"Photos, candles, marigolds (cempasúchil) and their favourite foods.", icon:"flower"},
        {es:"La posada", pron:"lah poh-SAH-dah", en:"A Christmas party (16–24 December)", why:"Re-enacts Mary and Joseph asking for shelter — posada = inn.", icon:"star"},
        {es:"La piñata", pron:"lah pee-NYAH-tah", en:"The piñata", icon:"star"},
        {es:"El Grito", pron:"el GREE-toh", en:"Independence night (15 September)", why:"El Grito = the shout: the cry of independence, repeated every year at 11pm.", icon:"star"},
      ]},
      { label: "Conversational", cards: [
        {es:"¿Cuántos años cumples?", pron:"KWAHN-tohs AH-nyohs KOOM-plehs", en:"How old are you turning?", ctx:"It’s a friend’s birthday and you’re curious.", icon:"star"},
        {es:"Que cumplas muchos más", pron:"keh KOOM-plahs MOO-chohs mahs", en:"Many happy returns", ctx:"You’re toasting someone on their birthday.", why:"Que + subjunctive = may you… May you turn many more.", icon:"star"},
        {es:"¡Que le muerda!", pron:"keh leh MWEHR-dah", en:"Bite the cake!", ctx:"The birthday girl is standing over her cake and everyone starts chanting.", why:"Mexican tradition: the birthday person takes a bite straight from the cake — and usually gets pushed into it.", icon:"flower"},
        {es:"Vamos a poner la ofrenda", pron:"VAH-mohs ah poh-NEHR lah oh-FREN-dah", en:"Let’s set up the ofrenda", ctx:"It’s late October and you’re getting the photos and candles out.", icon:"flower"},
        {es:"Pan de muerto", pron:"pahn deh MWEHR-toh", en:"Day of the Dead sweet bread", icon:"flower"},
        {es:"¿Qué deseo pediste?", pron:"keh deh-SEH-oh peh-DEES-teh", en:"What did you wish for?", why:"Pedir un deseo = to make a wish.", icon:"star"},
        {es:"¡Rompe la piñata!", pron:"ROHM-peh lah pee-NYAH-tah", en:"Break the piñata!", icon:"star"},
        {es:"Los tamales", pron:"lohs tah-MAH-lehs", en:"Tamales", why:"Eaten at Christmas and on 2 February (Día de la Candelaria).", icon:"chili"},
        {es:"La rosca de Reyes", pron:"lah ROHS-kah deh REH-yehs", en:"Three Kings’ bread (6 January)", icon:"star"},
        {es:"¡Te salió el niño!", pron:"teh sah-lee-OH el NEE-nyoh", en:"You got the baby figure!", ctx:"Your slice of rosca has the little plastic baby in it.", why:"Whoever finds it hosts the tamales on 2 February!", icon:"star"},
      ]},
      { label: "Natural & Slang", cards: [
        {es:"¡Viva México!", pron:"VEE-vah MEH-hee-koh", en:"Long live Mexico!", ctx:"It’s 15 September at 11pm and the crowd is shouting.", icon:"star"},
        {es:"¡Dale, dale, dale!", pron:"DAH-leh, DAH-leh, DAH-leh", en:"Hit it, hit it, hit it!", ctx:"Someone is blindfolded and swinging at the piñata.", why:"The start of the piñata song. Dale = hit it / go for it.", icon:"star"},
        {es:"El aguinaldo", pron:"el ah-gee-NAHL-doh", en:"The Christmas bonus", why:"Every Mexican worker gets one in December. At posadas it also means a bag of sweets.", icon:"diamond"},
        {es:"Echar la casa por la ventana", pron:"eh-CHAR lah KAH-sah por lah ven-TAH-nah", en:"To go all out", why:"Literally “throw the house out the window”.", icon:"house"},
        {es:"El recalentado", pron:"el reh-kah-len-TAH-doh", en:"The leftovers party", why:"The day after Christmas or New Year, when everyone comes back to reheat and finish the food.", icon:"chili"},
        {es:"Las doce uvas", pron:"lahs DOH-seh OO-vahs", en:"The twelve grapes", why:"Eaten at midnight on New Year’s Eve — one per chime, with a wish for each month.", icon:"leaf"},
        {es:"Pedir posada", pron:"peh-DEER poh-SAH-dah", en:"To ask for shelter (the posada song)", icon:"star"},
        {es:"Te recordamos con cariño", pron:"teh reh-kor-DAH-mohs kohn kah-REE-nyoh", en:"We remember you with love", ctx:"You light a candle on the ofrenda for your partner’s grandfather.", icon:"flower"},
        {es:"¡Felicidades!", pron:"feh-lee-see-DAH-dehs", en:"Congratulations!", ctx:"Your brother-in-law just announced he’s getting married.", icon:"star"},
        {es:"¡Que siga la fiesta!", pron:"keh SEE-gah lah fee-ES-tah", en:"Let the party go on!", icon:"star"},
      ]},
    ]
  },
};

const ICONS = {
  wave: '<path d="M4 26C10 14 16 14 22 26C28 38 34 38 40 26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  sun: '<circle cx="24" cy="24" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/><g stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="38" y1="24" x2="43" y2="24"/><line x1="33.9" y1="33.9" x2="37.4" y2="37.4"/><line x1="24" y1="38" x2="24" y2="43"/><line x1="14.1" y1="33.9" x2="10.6" y2="37.4"/><line x1="10" y1="24" x2="5" y2="24"/><line x1="14.1" y1="14.1" x2="10.6" y2="10.6"/><line x1="24" y1="10" x2="24" y2="5"/><line x1="33.9" y1="14.1" x2="37.4" y2="10.6"/></g>',
  spiral: '<path d="M24 24C24 18 30 16 34 20C38 24 36 30 30 30C25 30 22 26 24 22C26 18 30 18 31 21" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>',
  star: '<path d="M24 4L29.6 17.3L44 18.5L33 27.9L36.4 42L24 34.3L11.6 42L15 27.9L4 18.5L18.4 17.3Z" fill="currentColor"/>',
  moon: '<path d="M29 8C21 8 15 14 15 22C15 30 21 36 29 36C31 36 33 35.5 34.5 34.7C29 33 25 28 25 22C25 16 29 11 34.5 9.3C33 8.5 31 8 29 8Z" fill="currentColor"/>',
  flower: '<circle cx="24" cy="24" r="4" fill="currentColor"/><circle cx="33" cy="24" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="26.8" cy="32.6" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16.7" cy="29.3" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16.7" cy="18.7" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="26.8" cy="15.4" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/>',
  leaf: '<path d="M12 36C12 20 24 8 40 8C40 24 28 36 12 36Z" fill="currentColor"/>',
  diamond: '<path d="M24 6L38 24L24 42L10 24Z" fill="none" stroke="currentColor" stroke-width="2.3"/><path d="M24 15L32 24L24 33L16 24Z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  heart: '<path d="M24 40C24 40 8 29 8 18C8 12 12 8 17 8C20 8 23 10 24 13C25 10 28 8 31 8C36 8 40 12 40 18C40 29 24 40 24 40Z" fill="currentColor"/>',
  bird: '<path d="M6 26C12 18 18 18 24 24C30 18 36 18 42 26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  house: '<path d="M8 24L24 10L40 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 21V40H35V21" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="21" y="28" width="6" height="12" fill="currentColor"/>',
  chili: '<path d="M18 10C18 10 14 14 16 22C18 30 26 34 32 30C38 26 36 16 30 12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 10C16 8 14 7 12 8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
};
// Deck badges: white icons on the deck's colour, 24x24 grid. Keyed by the deck's `icon`.
const DECK_BADGES = {
  wave: '<path d="M4 5h16a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 17h-9l-5 4v-4H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 5z"/><circle cx="8" cy="11" r=".9" fill="currentColor"/><circle cx="12" cy="11" r=".9" fill="currentColor"/><circle cx="16" cy="11" r=".9" fill="currentColor"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" fill="currentColor"/>',
  house: '<path d="M3.5 11L12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M12 17.2s-2.8-1.7-2.8-3.6a1.5 1.5 0 0 1 2.8-.8 1.5 1.5 0 0 1 2.8.8c0 1.9-2.8 3.6-2.8 3.6z" fill="currentColor" stroke-width="1"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.2 2"/>',
  smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.2c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2"/><circle cx="9.2" cy="10" r=".9" fill="currentColor"/><circle cx="14.8" cy="10" r=".9" fill="currentColor"/>',
  sofa: '<path d="M5.5 11V8.5A2.5 2.5 0 0 1 8 6h8a2.5 2.5 0 0 1 2.5 2.5V11"/><path d="M3 12.5a1.5 1.5 0 0 1 3 0V14h12v-1.5a1.5 1.5 0 0 1 3 0V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M6 18v2M18 18v2"/>',
  pin: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
  people: '<circle cx="8" cy="8" r="2.6"/><circle cx="16" cy="8" r="2.6"/><path d="M3 19c0-3 2.2-5 5-5s5 2 5 5M11 19c0-3 2.2-5 5-5s5 2 5 5"/>',
  party: '<path d="M3 5.5c6 2.2 12 2.2 18 0"/><path d="M5 6.4l1.2 5.1 2.6-4.3M10.2 7.3l1.8 5 1.8-5M15.2 7.2l2.6 4.3 1.2-5.1"/><path d="M8 17l.6 1.6M12 15.5v2M16 17l-.6 1.6"/>',
  mine: '<path d="M4 20l1.2-4.2L15.8 5.2a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8L8.2 18.8z"/><path d="M13.8 7.2l3 3"/>', // a pencil
  chili: '<path d="M2.5 17.5a9.5 9.5 0 0 1 19 0z"/><path d="M5 11.5c1-.8 2 .2 3-.7s2 .2 3-.6 2 .1 3-.6 2 .2 3-.5 1.6.3 2.2.4"/>', // a taco
};
function deckBadge(deck){
  return '<span class="deck-badge" style="background:' + (deck.color || '#1B6B78') + '" aria-hidden="true">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    (DECK_BADGES[deck.icon] || DECK_BADGES.heart) + '</svg></span>';
}

// The sound button's speaker, drawn to match the icons above (24x24 grid, currentColor).
const SPEAKER_SVG = '<svg viewBox="0 0 24 24" class="speaker-svg" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
function iconSvg(key, cls){
  return '<svg viewBox="0 0 48 48" class="' + (cls || 'card-icon-svg') + '">' + (ICONS[key] || ICONS.star) + '</svg>';
}
