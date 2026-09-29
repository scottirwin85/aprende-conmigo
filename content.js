// content.js — all app content, kept separate from app logic.
// Add a new deck by adding a new top-level key here (name, icon, levels[]).
// Add a level by appending {label, cards:[...]} to a deck's levels array.
// Progress is keyed by deck + the card's `es` text, so cards can be added,
// reordered or removed freely. Keep `es` unique within a deck, and note that
// editing a card's `es` text starts that card's progress over — unless you
// add was:"<old es text>" to the card, which carries its progress across.
// Words that change with gender show both forms ("orgulloso / orgullosa").
// Add an icon by adding a key to ICONS (SVG inner-markup, viewBox 0 0 48 48, use currentColor).

const DECKS = {
  everyday: {
    name: "Everyday & Greetings",
    icon: "wave",
    levels: [
      { label: "Basics", cards: [
        {es:"¿Qué onda?", pron:"keh OHN-dah", en:"What's up? (very Mexican, casual)", icon:"wave"},
        {es:"¿Cómo amaneciste?", pron:"KOH-moh ah-mah-neh-SEES-teh", en:"How did you wake up / sleep? (caring morning greeting)", icon:"sun"},
        {es:"Ahorita", pron:"ah-oh-REE-tah", en:"In a bit / right now (famously flexible timing)", icon:"spiral"},
        {es:"Está padre", pron:"es-TAH PAH-dreh", en:"That's cool / awesome", icon:"star"},
        {es:"¿Qué tal?", pron:"keh TAHL", en:"How's it going?", icon:"wave"},
        {es:"Nos vemos al rato", pron:"nohs VEH-mohs ahl RAH-toh", en:"See you in a while", icon:"moon"},
        {es:"Provecho", pron:"proh-VEH-choh", en:"Enjoy your meal (said to others, even strangers)", icon:"flower"},
        {es:"Con permiso", pron:"kohn pehr-MEE-soh", en:"Excuse me (asking to pass)", icon:"leaf"},
        {es:"Órale", pron:"OH-rah-leh", en:"Wow / okay / let's go — all-purpose exclamation", icon:"star"},
        {es:"No manches", pron:"noh MAHN-chehs", en:"No way / you're kidding", icon:"diamond"},
      ]},
      { label: "Conversational", cards: [
        {es:"¿Cómo te fue hoy?", pron:"KOH-moh teh FWEH oy", en:"How did it go today?", icon:"sun"},
        {es:"Ya llegué", pron:"yah yeh-GEH", en:"I'm home / I've arrived", icon:"house"},
        {es:"¿Ya vas a cenar?", pron:"yah vahs ah seh-NAR", en:"Are you going to have dinner now?", icon:"flower"},
        {es:"No hay bronca", pron:"noh eye BROHN-kah", en:"No worries / no problem", icon:"wave"},
        {es:"Échale ganas", pron:"EH-chah-leh GAH-nahs", en:"Give it your best / go for it", icon:"star"},
        {es:"Al rato te marco", pron:"ahl RAH-toh teh MAR-koh", en:"I'll call you in a bit", icon:"moon"},
        {es:"¿Me acompañas?", pron:"meh ah-kohm-PAH-nyahs", en:"Will you come with me?", icon:"bird"},
        {es:"Ya casi llego", pron:"yah KAH-see YEH-goh", en:"I'm almost there", icon:"spiral"},
        {es:"Se me hizo tarde", pron:"seh meh EE-soh TAR-deh", en:"I ran late", icon:"moon"},
        {es:"Todo bien por acá", pron:"TOH-doh bee-EHN por ah-KAH", en:"Everything's good over here", icon:"leaf"},
      ]},
      { label: "Natural & Slang", cards: [
        {es:"Ando bien ocupado / ocupada", was:"Ando bien ocupado", pron:"AHN-doh bee-EHN oh-koo-PAH-doh / oh-koo-PAH-dah", en:"I'm pretty busy right now (ocupado if a man says it, ocupada if a woman does)", icon:"spiral"},
        {es:"Me late", pron:"meh LAH-teh", en:"I'm into it / sounds good (Mexican slang)", icon:"star"},
        {es:"Ni modo", pron:"nee MOH-doh", en:"Oh well / nothing to be done", icon:"leaf"},
        {es:"Aguas", pron:"AH-gwahs", en:"Watch out / be careful", icon:"diamond"},
        {es:"Se armó", pron:"seh ar-MOH", en:"It's on / here we go", icon:"star"},
        {es:"Está cañón", pron:"es-TAH kah-NYOHN", en:"That's tough / intense", icon:"diamond"},
        {es:"Neta", pron:"NEH-tah", en:"Really / seriously (truth)", icon:"wave"},
        {es:"Chido", pron:"CHEE-doh", en:"Cool / awesome", icon:"star"},
        {es:"Fíjate que...", pron:"FEE-hah-teh keh", en:"So, get this... (conversational opener)", icon:"bird"},
        {es:"Ahí la llevamos", pron:"ah-EE lah yeh-VAH-mohs", en:"We're getting by / making do", icon:"spiral"},
      ]},
    ]
  },
  love: {
    name: "Love & Terms of Endearment",
    icon: "heart",
    levels: [
      { label: "Basics", cards: [
        {es:"Mi amor", pron:"mee ah-MOR", en:"My love", icon:"heart"},
        {es:"Te quiero mucho", pron:"teh kee-EH-roh MOO-choh", en:"I love you a lot (everyday warmth)", icon:"heart"},
        {es:"Te extraño", pron:"teh ehs-TRAH-nyoh", en:"I miss you", icon:"moon"},
        {es:"Mi vida", pron:"mee VEE-dah", en:"My life (term of endearment)", icon:"sun"},
        {es:"Eres mi todo", pron:"EH-rehs mee TOH-doh", en:"You're my everything", icon:"star"},
        {es:"Me haces muy feliz", pron:"meh AH-sehs mwee feh-LEES", en:"You make me very happy", icon:"flower"},
        {es:"Mi cielo", pron:"mee see-EH-loh", en:"My sky / darling", icon:"moon"},
        {es:"Gracias por todo", pron:"GRAH-see-ahs por TOH-doh", en:"Thank you for everything", icon:"flower"},
        {es:"Estoy orgulloso / orgullosa de ti", was:"Estoy orgulloso de ti", pron:"es-TOY or-goo-YOH-soh / or-goo-YOH-sah deh tee", en:"I'm proud of you (orgulloso if a man says it, orgullosa if a woman does)", icon:"star"},
        {es:"Siempre juntos", pron:"see-EHM-preh HOON-tohs", en:"Always together", icon:"spiral"},
      ]},
      { label: "Conversational", cards: [
        {es:"Pienso en ti todo el día", pron:"pee-EHN-soh en tee TOH-doh el DEE-ah", en:"I think about you all day", icon:"heart"},
        {es:"Contigo todo es mejor", pron:"kohn-TEE-goh TOH-doh es meh-HOR", en:"Everything is better with you", icon:"sun"},
        {es:"Me encanta tu sonrisa", pron:"meh en-KAHN-tah too sohn-REE-sah", en:"I love your smile", icon:"flower"},
        {es:"Eres mi persona favorita", pron:"EH-rehs mee pehr-SOH-nah fah-voh-REE-tah", en:"You're my favorite person", icon:"star"},
        {es:"No sé qué haría sin ti", pron:"noh seh keh ah-REE-ah seen tee", en:"I don't know what I'd do without you", icon:"moon"},
        {es:"Cada día te quiero más", pron:"KAH-dah DEE-ah teh kee-EH-roh mahs", en:"I love you more every day", icon:"heart"},
        {es:"Eres mi mejor decisión", pron:"EH-rehs mee meh-HOR deh-see-see-OHN", en:"You're my best decision", icon:"star"},
        {es:"Quiero envejecer contigo", pron:"kee-EH-roh en-veh-heh-SEHR kohn-TEE-goh", en:"I want to grow old with you", icon:"spiral"},
        {es:"Me haces sentir en casa", pron:"meh AH-sehs sen-TEER en KAH-sah", en:"You make me feel at home", icon:"house"},
        {es:"Tú eres mi paz", pron:"too EH-rehs mee pahs", en:"You are my peace", icon:"leaf"},
      ]},
      { label: "Deep & Idiomatic", cards: [
        {es:"Eres mi media naranja", pron:"EH-rehs mee MEH-dee-ah nah-RAHN-hah", en:"You're my other half (lit. \"my half orange\")", icon:"flower"},
        {es:"Contigo hasta el fin del mundo", pron:"kohn-TEE-goh AHS-tah el feen del MOON-doh", en:"With you to the end of the world", icon:"bird"},
        {es:"Me robaste el corazón", pron:"meh roh-BAHS-teh el koh-rah-SOHN", en:"You stole my heart", icon:"heart"},
        {es:"Eres el amor de mi vida", pron:"EH-rehs el ah-MOR deh mee VEE-dah", en:"You're the love of my life", icon:"star"},
        {es:"No cambiaría nada de nosotros", pron:"noh kahm-bee-ah-REE-ah NAH-dah deh noh-SOH-trohs", en:"I wouldn't change anything about us", icon:"diamond"},
        {es:"Gracias por elegirme cada día", pron:"GRAH-see-ahs por eh-leh-HEER-meh KAH-dah DEE-ah", en:"Thank you for choosing me every day", icon:"sun"},
        {es:"Contigo aprendí a amar de verdad", pron:"kohn-TEE-goh ah-prehn-DEE ah ah-MAR deh vehr-DAHD", en:"With you I learned to really love", icon:"heart"},
        {es:"Eres mi lugar favorito", pron:"EH-rehs mee loo-GAR fah-voh-REE-toh", en:"You're my favorite place", icon:"house"},
        {es:"Nuestro amor es mi hogar", pron:"NWES-troh ah-MOR es mee oh-GAR", en:"Our love is my home", icon:"house"},
        {es:"Para siempre y un día más", pron:"PAH-rah see-EHM-preh ee oon DEE-ah mahs", en:"Forever and a day more", icon:"spiral"},
      ]},
    ]
  },
  family: {
    name: "Family",
    icon: "house",
    levels: [
      { label: "Basics", cards: [
        {es:"La familia", pron:"lah fah-MEE-lee-ah", en:"The family", icon:"bird"},
        {es:"Mi esposo / Mi esposa", was:"Mi esposo", pron:"mee es-POH-soh / mee es-POH-sah", en:"My husband / My wife", icon:"heart"},
        {es:"Los suegros", pron:"lohs SWEH-grohs", en:"The in-laws", icon:"leaf"},
        {es:"El cariño", pron:"el kah-REE-nyoh", en:"Affection / fondness", icon:"heart"},
        {es:"La casa", pron:"lah KAH-sah", en:"The house / home", icon:"house"},
        {es:"Extraño mi tierra", pron:"ehs-TRAH-nyoh mee tee-EH-rrah", en:"I miss my homeland", icon:"leaf"},
        {es:"Mi pueblo", pron:"mee PWEH-bloh", en:"My hometown", icon:"house"},
        {es:"La familia es primero", pron:"lah fah-MEE-lee-ah es pree-MEH-roh", en:"Family comes first", icon:"bird"},
        {es:"Bienvenido / Bienvenida a casa", was:"Bienvenido a casa", pron:"bee-ehn-veh-NEE-doh / bee-ehn-veh-NEE-dah ah KAH-sah", en:"Welcome home (bienvenido to a man, bienvenida to a woman)", icon:"house"},
        {es:"Estamos juntos en esto", pron:"es-TAH-mohs HOON-tohs en ES-toh", en:"We're in this together", icon:"spiral"},
      ]},
      { label: "Conversational", cards: [
        {es:"¿Cómo está tu familia?", pron:"KOH-moh es-TAH too fah-MEE-lee-ah", en:"How is your family?", icon:"bird"},
        {es:"Los extraño mucho", pron:"lohs ehs-TRAH-nyoh MOO-choh", en:"I miss them a lot", icon:"moon"},
        {es:"Vamos a visitar a tus papás", pron:"VAH-mohs ah vee-see-TAR ah toos pah-PAHS", en:"Let's go visit your parents", icon:"house"},
        {es:"Diles que los quiero", pron:"DEE-lehs keh lohs kee-EH-roh", en:"Tell them I love them", icon:"heart"},
        {es:"Ya quiero conocer tu pueblo", pron:"yah kee-EH-roh koh-noh-SEHR too PWEH-bloh", en:"I can't wait to see your hometown", icon:"house"},
        {es:"Aquí también tienes familia", pron:"ah-KEE tahm-bee-EHN tee-EH-nehs fah-MEE-lee-ah", en:"You have family here too", icon:"bird"},
        {es:"Tu casa es mi casa", pron:"too KAH-sah es mee KAH-sah", en:"Your home is my home", icon:"house"},
        {es:"Vamos a hacer nuestra propia familia", pron:"VAH-mohs ah ah-SEHR NWES-trah PROH-pee-ah fah-MEE-lee-ah", en:"Let's build our own family", icon:"flower"},
        {es:"Siempre tendrás un lugar aquí", pron:"see-EHM-preh ten-DRAHS oon loo-GAR ah-KEE", en:"You'll always have a place here", icon:"leaf"},
        {es:"Estoy feliz de ser parte de tu familia", pron:"es-TOY feh-LEES deh sehr PAR-teh deh too fah-MEE-lee-ah", en:"I'm happy to be part of your family", icon:"star"},
      ]},
      { label: "Deep & Idiomatic", cards: [
        {es:"La distancia no borra el cariño", pron:"lah dees-TAHN-see-ah noh BOH-rrah el kah-REE-nyoh", en:"Distance doesn't erase the love", icon:"moon"},
        {es:"Llevas tu tierra en el corazón", pron:"YEH-vahs too tee-EH-rrah en el koh-rah-SOHN", en:"You carry your homeland in your heart", icon:"leaf"},
        {es:"Tu familia ya es mi familia", pron:"too fah-MEE-lee-ah yah es mee fah-MEE-lee-ah", en:"Your family is already my family", icon:"heart"},
        {es:"Un día volveremos juntos a tu pueblo", pron:"oon DEE-ah vohl-veh-REH-mohs HOON-tohs ah too PWEH-bloh", en:"One day we'll go back to your hometown together", icon:"spiral"},
        {es:"Aquí construimos nuestro propio hogar", pron:"ah-KEE kohn-stroo-EE-mohs NWES-troh PROH-pee-oh oh-GAR", en:"Here we're building our own home", icon:"house"},
        {es:"Nada reemplaza estar en casa", pron:"NAH-dah reh-em-PLAH-sah es-TAR en KAH-sah", en:"Nothing replaces being home", icon:"house"},
        {es:"Te acompaño a donde vayas", pron:"teh ah-kohm-PAH-nyoh ah DOHN-deh VAH-yahs", en:"I'll go with you wherever you go", icon:"bird"},
        {es:"Somos familia, pase lo que pase", pron:"SOH-mohs fah-MEE-lee-ah PAH-seh loh keh PAH-seh", en:"We're family, no matter what", icon:"diamond"},
        {es:"Tu raíz es parte de mí ahora", pron:"too rah-EES es PAR-teh deh mee ah-OH-rah", en:"Your roots are part of me now", icon:"leaf"},
        {es:"Donde estés tú, ahí está mi hogar", pron:"DOHN-deh es-TEHS too ah-EE es-TAH mee oh-GAR", en:"Wherever you are, that's my home", icon:"sun"},
      ]},
    ]
  },
  food: {
    name: "Food",
    icon: "chili",
    levels: [
      { label: "Basics", cards: [
        {es:"¿Qué se te antoja?", pron:"keh seh teh ahn-TOH-hah", en:"What are you craving?", icon:"flower"},
        {es:"Está delicioso", pron:"es-TAH deh-lee-see-OH-soh", en:"It's delicious", icon:"chili"},
        {es:"Pica un poco", pron:"PEE-kah oon POH-koh", en:"It's a little spicy", icon:"chili"},
        {es:"Se me hace agua la boca", pron:"seh meh AH-seh AH-gwah lah BOH-kah", en:"My mouth is watering", icon:"wave"},
        {es:"La sobremesa", pron:"lah soh-breh-MEH-sah", en:"Time spent chatting at the table after eating", icon:"spiral"},
        {es:"Buen provecho", pron:"bwehn proh-VEH-choh", en:"Enjoy your meal", icon:"flower"},
        {es:"Está para chuparse los dedos", pron:"es-TAH PAH-rah choo-PAR-seh lohs DEH-dohs", en:"It's finger-licking good", icon:"star"},
        {es:"¿Ya comiste?", pron:"yah koh-MEES-teh", en:"Have you eaten yet? (common caring question)", icon:"sun"},
        {es:"Hecho con cariño", pron:"EH-choh kohn kah-REE-nyoh", en:"Made with love", icon:"heart"},
        {es:"Repetir", pron:"reh-peh-TEER", en:"To repeat — at a meal, to have seconds", icon:"spiral"},
      ]},
      { label: "Conversational", cards: [
        {es:"¿Qué vamos a cocinar hoy?", pron:"keh VAH-mohs ah koh-see-NAR oy", en:"What are we cooking today?", icon:"chili"},
        {es:"Se me antoja algo picante", pron:"seh meh ahn-TOH-hah AHL-goh pee-KAHN-teh", en:"I'm craving something spicy", icon:"chili"},
        {es:"¿Le echamos más limón?", pron:"leh eh-CHAH-mohs mahs lee-MOHN", en:"Should we add more lime?", icon:"leaf"},
        {es:"Está quedando muy rico", pron:"es-TAH keh-DAHN-doh mwee REE-koh", en:"This is turning out really good", icon:"star"},
        {es:"Vamos por unos tacos", pron:"VAH-mohs por OO-nohs TAH-kohs", en:"Let's go get some tacos", icon:"chili"},
        {es:"¿Ya está la salsa?", pron:"yah es-TAH lah SAHL-sah", en:"Is the salsa ready?", icon:"chili"},
        {es:"Huele delicioso", pron:"WEH-leh deh-lee-see-OH-soh", en:"It smells delicious", icon:"flower"},
        {es:"Enséñame a hacerlo", pron:"en-SEH-nyah-meh ah ah-SEHR-loh", en:"Teach me how to make it", icon:"spiral"},
        {es:"Así lo hacía mi abuela", pron:"ah-SEE loh ah-SEE-ah mee ah-BWEH-lah", en:"That's how my grandma used to make it", icon:"house"},
        {es:"Vamos a comer como reyes", pron:"VAH-mohs ah koh-MEHR KOH-moh REH-yehs", en:"We're going to eat like kings", icon:"star"},
      ]},
      { label: "Idioms & Culture", cards: [
        {es:"No hay como la comida de casa", pron:"noh eye KOH-moh lah koh-MEE-dah deh KAH-sah", en:"There's nothing like home cooking", icon:"house"},
        {es:"Cocinar es un acto de amor", pron:"koh-see-NAR es oon AHK-toh deh ah-MOR", en:"Cooking is an act of love", icon:"heart"},
        {es:"Cada platillo cuenta una historia", pron:"KAH-dah plah-TEE-yoh KWEHN-tah OO-nah ees-TOH-ree-ah", en:"Every dish tells a story", icon:"flower"},
        {es:"La cocina une a la familia", pron:"lah koh-SEE-nah OO-neh ah lah fah-MEE-lee-ah", en:"The kitchen brings the family together", icon:"bird"},
        {es:"Comer bien es vivir bien", pron:"koh-MEHR bee-EHN es vee-VEER bee-EHN", en:"Eating well is living well", icon:"sun"},
        {es:"Este sabor me lleva a casa", pron:"ES-teh sah-BOR meh YEH-vah ah KAH-sah", en:"This flavor takes me home", icon:"house"},
        {es:"Nunca falta el chile en la mesa", pron:"NOON-kah FAHL-tah el CHEE-leh en lah MEH-sah", en:"There's always chile on the table", icon:"chili"},
        {es:"Se cocina con paciencia y cariño", pron:"seh koh-SEE-nah kohn pah-see-EHN-see-ah ee kah-REE-nyoh", en:"It's cooked with patience and love", icon:"heart"},
        {es:"La sazón no se aprende, se hereda", pron:"lah sah-SOHN noh seh ah-PREHN-deh seh eh-REH-dah", en:"The seasoning isn't learned, it's inherited", icon:"spiral"},
        {es:"Buen provecho y buena compañía", pron:"bwehn proh-VEH-choh ee BWEH-nah kohm-pah-NYEE-ah", en:"Good food and good company", icon:"flower"},
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
function iconSvg(key, cls){
  return '<svg viewBox="0 0 48 48" class="' + (cls || 'card-icon-svg') + '">' + (ICONS[key] || ICONS.star) + '</svg>';
}
