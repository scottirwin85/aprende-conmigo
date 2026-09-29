// conversations.js — short dialogues using each deck's phrases, for the
// Conversations tab. Lines are [who, Spanish, English]; who is 'you' or 'them'.
// `them` names the other speaker. Keep "you" lines free of words that change
// with the speaker's gender, so they suit anyone.
const CONVERSATIONS = {
  everyday: [
    { id: 'home', title: 'Coming home', them: 'Tu pareja · your partner', lines: [
      ['you', 'Ya llegué.', 'I’m home.'],
      ['them', '¡Hola! ¿Cómo te fue hoy?', 'Hi! How did it go today?'],
      ['you', 'Bien, pero se me hizo tarde. ¿Y tú?', 'Good, but I ran late. And you?'],
      ['them', 'Todo bien por acá. ¿Ya vas a cenar?', 'All good here. Are you going to eat now?'],
      ['you', 'Ahorita. Primero me baño.', 'In a bit. I’ll shower first.'],
      ['them', 'Órale, no hay bronca.', 'Okay, no worries.'],
    ]},
    { id: 'plans', title: 'Weekend plans', them: 'Un amigo · a friend', lines: [
      ['them', '¿Qué onda? ¿Qué haces el sábado?', 'What’s up? What are you doing on Saturday?'],
      ['you', 'Nada, ¿por?', 'Nothing, why?'],
      ['them', 'Vamos por unos tacos. ¿Te late?', 'Let’s go get some tacos. You in?'],
      ['you', '¡Me late! Está padre la idea.', 'I’m in! Cool idea.'],
      ['them', 'Sale. Nos vemos a las ocho.', 'Deal. See you at eight.'],
      ['you', 'Va. Nos vemos.', 'OK. See you.'],
    ]},
  ],
  love: [
    { id: 'miss', title: 'Missing you', them: 'Tu pareja · your partner', lines: [
      ['them', '¡Hola, mi amor!', 'Hi, my love!'],
      ['you', '¡Hola, mi vida! Te extraño mucho.', 'Hi, darling! I miss you so much.'],
      ['them', 'Yo también. Pienso en ti todo el día.', 'Me too. I think about you all day.'],
      ['you', '¿Cuándo regresas?', 'When are you coming back?'],
      ['them', 'El viernes. Ya casi.', 'On Friday. Nearly there.'],
      ['you', 'Contigo todo es mejor. Te quiero mucho.', 'Everything’s better with you. I love you so much.'],
    ]},
    { id: 'anniversary', title: 'Anniversary dinner', them: 'Tu pareja · your partner', lines: [
      ['you', 'Feliz aniversario, mi amor.', 'Happy anniversary, my love.'],
      ['them', 'Feliz aniversario. Gracias por elegirme cada día.', 'Happy anniversary. Thank you for choosing me every day.'],
      ['you', 'Eres mi media naranja.', 'You’re my other half.'],
      ['them', '¿Y si te digo que quiero envejecer contigo?', 'And what if I told you I want to grow old with you?'],
      ['you', 'Te diría que no cambiaría nada de nosotros.', 'I’d tell you I wouldn’t change a thing about us.'],
    ]},
  ],
  family: [
    { id: 'call', title: 'A call home', them: 'Tu pareja · your partner', lines: [
      ['them', 'Voy a hablarle a mi mamá.', 'I’m going to call my mum.'],
      ['you', '¡Qué bien! Diles que los quiero.', 'Great! Tell them I love them.'],
      ['them', 'Claro. Te manda saludos.', 'Of course. She says hi.'],
      ['you', '¿Cómo está tu familia?', 'How’s your family?'],
      ['them', 'Bien, pero los extraño mucho.', 'Good, but I miss them a lot.'],
      ['you', 'Un día volveremos juntos a tu pueblo.', 'One day we’ll go back to your hometown together.'],
    ]},
    { id: 'back', title: 'Back from a trip', them: 'Tu pareja · your partner', lines: [
      ['them', '¡Ya llegué!', 'I’m home!'],
      ['you', '¡Qué bueno que ya llegaste!', 'So good that you’re back!'],
      ['them', 'Extrañaba mi casa.', 'I missed home.'],
      ['you', 'Aquí también tienes familia.', 'You have family here too.'],
      ['them', 'Lo sé. Donde estés tú, ahí está mi hogar.', 'I know. Wherever you are, that’s my home.'],
    ]},
  ],
  food: [
    { id: 'cooking', title: 'Cooking together', them: 'Tu pareja · your partner', lines: [
      ['you', '¿Qué vamos a cocinar hoy?', 'What are we cooking today?'],
      ['them', 'Tacos. ¿Qué se te antoja?', 'Tacos. What are you in the mood for?'],
      ['you', 'Se me antoja algo picante.', 'I’m craving something spicy.'],
      ['them', 'Prueba la salsa. ¿Pica?', 'Try the salsa. Is it spicy?'],
      ['you', 'Pica un poco… ¡pero está delicioso!', 'It’s a little spicy… but it’s delicious!'],
      ['them', 'Así lo hacía mi abuela.', 'That’s how my grandma used to make it.'],
    ]},
    { id: 'table', title: 'At the table', them: 'Tu suegra · your mother-in-law', lines: [
      ['them', '¡Buen provecho!', 'Enjoy your meal!'],
      ['you', 'Gracias. ¡Huele delicioso!', 'Thank you. It smells delicious!'],
      ['them', '¿Quieres repetir?', 'Would you like seconds?'],
      ['you', 'Sí, por favor. Está para chuparse los dedos.', 'Yes, please. It’s finger-licking good.'],
      ['them', 'Hecho con cariño.', 'Made with love.'],
    ]},
  ],
  numbers: [
    { id: 'time', title: 'What time?', them: 'Tu pareja · your partner', lines: [
      ['you', '¿A qué hora llegas?', 'What time do you get here?'],
      ['them', 'Como a las ocho y media.', 'Around half past eight.'],
      ['you', '¿Tan tarde?', 'That late?'],
      ['them', 'Hay mucho tráfico. Llego en treinta minutos, más o menos.', 'There’s a lot of traffic. I’ll be there in thirty minutes, more or less.'],
      ['you', 'Sale. Te espero.', 'OK. I’ll wait for you.'],
    ]},
  ],
  feelings: [
    { id: 'rough', title: 'A rough day', them: 'Tu pareja · your partner', lines: [
      ['them', '¿Cómo te sientes?', 'How are you feeling?'],
      ['you', 'Ando de malas. Tuve un día muy cañón.', 'I’m in a bad mood. I had a really tough day.'],
      ['them', 'No te preocupes. ¿Necesitas un abrazo?', 'Don’t worry. Do you need a hug?'],
      ['you', 'Sí, necesito un abrazo.', 'Yes, I need a hug.'],
      ['them', 'Ven aquí.', 'Come here.'],
      ['you', 'Gracias. Ya me siento mejor.', 'Thanks. I feel better already.'],
    ]},
  ],
  home: [
    { id: 'chores', title: 'Sunday chores', them: 'Tu pareja · your partner', lines: [
      ['them', 'Hay que lavar los trastes.', 'The dishes need washing.'],
      ['you', 'Yo lavé ayer. Te toca a ti.', 'I washed up yesterday. It’s your turn.'],
      ['them', 'Ay, ¡qué flojera!', 'Ugh, I can’t be bothered!'],
      ['you', 'Yo saco la basura, ¿sale?', 'I’ll take out the rubbish, deal?'],
      ['them', 'Sale. Y luego vemos la tele.', 'Deal. And then we’ll watch TV.'],
    ]},
  ],
  outabout: [
    { id: 'restaurant', title: 'At a restaurant', them: 'El mesero · the waiter', lines: [
      ['them', 'Buenas tardes. ¿Cuántos son?', 'Good afternoon. How many of you?'],
      ['you', 'Una mesa para dos, por favor.', 'A table for two, please.'],
      ['them', 'Pásenle. ¿Qué les traigo?', 'Come on in. What can I get you?'],
      ['you', 'Dos tacos al pastor y un agua de horchata, por favor.', 'Two al pastor tacos and a horchata, please.'],
      ['them', 'Con mucho gusto.', 'With pleasure.'],
      ['you', 'Joven, ¿me trae la cuenta? ¿Aceptan tarjeta?', 'Excuse me, could you bring the bill? Do you take cards?'],
      ['them', 'Sí, claro.', 'Yes, of course.'],
    ]},
  ],
  texting: [
    { id: 'texts', title: 'Running late', them: 'Tu pareja · your partner', lines: [
      ['them', 'q onda, ¿ya vienes?', 'wassup, are you on your way?'],
      ['you', 'Voy en camino. Llego en 5.', 'On my way. Be there in 5.'],
      ['them', 'Va. ¿Dónde andas?', 'OK. Where are you?'],
      ['you', 'En el tráfico jaja', 'In traffic haha'],
      ['them', 'ntp. tqm', 'np. love you lots'],
      ['you', 'bss', 'kisses'],
    ]},
  ],
  inlaws: [
    { id: 'suegra', title: 'Meeting your mother-in-law', them: 'Tu suegra · your mother-in-law', lines: [
      ['them', '¡Pásale! Estás en tu casa.', 'Come in! Make yourself at home.'],
      ['you', 'Mucho gusto, señora. Gracias por invitarme.', 'Nice to meet you, ma’am. Thank you for having me.'],
      ['them', 'El gusto es mío. ¿Tienes hambre?', 'The pleasure is mine. Are you hungry?'],
      ['you', 'Sí, ¡huele delicioso! ¿Le ayudo con algo?', 'Yes, it smells delicious! Can I help you with anything?'],
      ['them', 'No, siéntate. Ya eres de la familia.', 'No, sit down. You’re family now.'],
      ['you', 'Estoy feliz de ser parte de su familia.', 'I’m happy to be part of your family.'],
    ]},
  ],
  celebrations: [
    { id: 'birthday', title: 'A birthday', them: 'Tu cuñada · your sister-in-law', lines: [
      ['you', '¡Feliz cumpleaños! ¿Cuántos años cumples?', 'Happy birthday! How old are you turning?'],
      ['them', '¡Treinta! Qué emoción.', 'Thirty! So exciting.'],
      ['you', '¡Que cumplas muchos más!', 'Many happy returns!'],
      ['them', 'Gracias. Ahora cantamos las mañanitas.', 'Thanks. Now we sing Las Mañanitas.'],
      ['you', 'Y luego… ¡que le muerda!', 'And then… bite the cake!'],
      ['them', '¡Ay, no! Siempre me empujan al pastel.', 'Oh no! They always push me into the cake.'],
    ]},
  ],
};
