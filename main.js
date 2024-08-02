import axios from 'axios'
import './style.css'


/** Web RTC things  */
const configuration = {
  iceServers: [
    {
      urls: ['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
    }
  ],
}
let offer = null
let answer = null
let newUser = null;
const CHANNEL_NAME = 'my-channel'
const BACKEND_URI = import.meta.env.VITE_BACKEND_URI
const connectionWebRTC = new RTCPeerConnection(configuration)
const channel = connectionWebRTC.createDataChannel(CHANNEL_NAME)
channel.onmessage = (event) => {
  console.log('Got a message', event.data)
}

channel.onopen = (event) = console.log('Channel opened')

connectionWebRTC.onicecandidate = (event) => {
  newUser = JSON.stringify(connectionWebRTC.localDescription)
    console.log(`
    New user
    Offer: ${newUser}
  `)

//   answer = JSON.stringify(connectionWebRTC.localDescription)
//   console.log(`
//   New user
//   Answer: ${answer}
// `)
}

connectionWebRTC.ondatachannel = (event) => {
  // Creating prop my data channel where I will save the data channel gotten from the initiator of the negotiation
  connectionWebRTC.myDataChannel = event.channel
  connectionWebRTC.myDataChannel.onmessage = (event) => {
    console.log(`New message from client:
    ${event.data}
    `)
  }

  connectionWebRTC.myDataChannel.onopen = (event) => {
    console.log('connection opened')
  }
}

/** Only WebRTC functions */
async function setOfferFromRemote(newOffer) {
  // edit here and put the offer
  try {
    await connectionWebRTC.setRemoteDescription(newOffer)
    console.log('connectionWebRTc', connectionWebRTC)
    console.log('offer set')
  } catch (error) {
    console.log('Error while setting remot description', error)
  }
}

// When the user wants to join, first we create an offer
async function createOffer() {
  const offerCreated = await connectionWebRTC.createOffer()
  connectionWebRTC.setLocalDescription(offerCreated)
  offer = JSON.stringify(offerCreated)
  console.log('offer set succesfully')
}

// Then we create an answer
async function createAnswer() {
  try {
    const newAnswer = await connectionWebRTC.createAnswer()
    connectionWebRTC.setLocalDescription(newAnswer)
    answer = JSON.stringify(newAnswer)
    console.log('answer created')
  } catch (error) {
    console.warn('error creating new answer', error)
  }
}

async function setAnswer(answer) {
  await connectionWebRTC.setRemoteDescription(answer)
}


/** Only BE functions */
async function checkDbConnection() {
  try {
    const paragraph = document.querySelector('#backend-status')
    paragraph.innerText = 'Loading...'
    const response = await axios.get(BACKEND_URI)
    const status = response?.data?.message
    if (status === 'Planning table backend answering') {
      paragraph.innerText = 'Backend is up and running'
    }
  } catch (error) {
    console.error(error)
  }
}

async function sendOffer() {
  try {
    const payload = {
      offer,
      offerName: CHANNEL_NAME,
    }
    const response = await axios.put(`${BACKEND_URI}/offer`, payload)
    console.log('success', response?.data?.message)
  } catch (error) {
    console.error('error creating new answer', error)
  }
}

async function getOffer() {
  try {
    const response = await axios.get(`${BACKEND_URI}/offer/${CHANNEL_NAME}`)
    const offers = response?.data?.data
    const message = response?.data?.message
    if (message === 'Offer not found' && !offers) {
      console.log('Offer not found')
      return null
    }

    const [offer] = offers
    const offerParsed = JSON.parse(offer)
    return offerParsed;
  } catch (error) {
    console.error(error)
  }
}

async function getAnswer() {
  try {
    const response = await axios.get(`${BACKEND_URI}/answer/${CHANNEL_NAME}`)
    const answers = response?.data?.data
    const message = response?.data?.message
    if (message === 'Answer not found' && !answers) {
      console.log('Answer not found')
      return null
    }

    const [answer] = answers
    const answerParsed = JSON.parse(answer)
    return answerParsed;
  } catch (error) {
    console.error(error)
  }
}

async function sendAnswer() {
  try {
    const payload = {
      answer,
      answerName: CHANNEL_NAME,
    }
    const response = await axios.put(`${BACKEND_URI}/answer`, payload)
    console.log('success', response?.data?.message)
  } catch (error) {
    console.error(error)
  }
}

function startListeningAnswers() {
  // Declare the interval ID
  let intervalId;

  // Define the function that runs periodically
  const listenAnswers = async () => {
    const newAnswer = await getAnswer();

    // If the task returns a response, clear the interval to stop further executions
    if (newAnswer) {
      await setAnswer(newAnswer)
      clearInterval(intervalId);
      console.log('Task stopped due to response:');
    }
  };

  // Execute the task immediately
  listenAnswers();

  // Set up the interval to run the task every 10 seconds (10000 milliseconds)
  intervalId = setInterval(listenAnswers, 10000);
}

document.querySelector('#create-session').addEventListener('click', async () => {
  try {
    const joinSessionButton = document.querySelector('#join-session')
    joinSessionButton.disabled = true

    // Create an offer
    await createOffer()
    // Send the offer to the API
    await sendOffer()
    startListeningAnswers()
  } catch (error) {
    console.error(error)
  }
})

document.querySelector('#join-session').addEventListener('click', async () => {
  try {
    const createSessionButton = document.querySelector('#create-session')
    createSessionButton.disabled = true

    // Get the offer from the API
    const newOffer = await getOffer()
    await setOfferFromRemote(newOffer)
    await createAnswer()
    await sendAnswer()
  } catch (error) {
    console.error(error)
  }
})
// document.querySelector('#test-button').addEventListener('click', async () => {
//   try {
//     await getAnswer()
//   } catch (error) {
//     console.error(error)
//   }
// })
document.querySelector('#check-db-connection').addEventListener('click', checkDbConnection)

document.querySelector('#send-message').addEventListener('click', () => {
  connectionWebRTC.myDataChannel.send('Hello!!')
})

