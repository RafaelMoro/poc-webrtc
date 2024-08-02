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
    const backendUri = import.meta.env.VITE_BACKEND_URI_LOCAL
    const response = await axios.get(backendUri)
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
    const backendUri = import.meta.env.VITE_BACKEND_URI_LOCAL
    const payload = {
      offer,
      offerName: 'my-channel',
    }
    const response = await axios.post(`${backendUri}/offer`, payload)
    console.log('success', response?.data?.message)
  } catch (error) {
    console.error('error creating new answer', error)
  }
}

async function getOffer() {
  try {
    const backendUri = import.meta.env.VITE_BACKEND_URI_LOCAL
    const response = await axios.get(`${backendUri}/offer/${CHANNEL_NAME}`)
    const offers = response?.data?.data
    console.log('response', response?.data?.data)
    if (offers.length === 0) {
      console.log('No offer found')
      return
    }

    const [offer] = offers
    const offerParsed = JSON.parse(offer)
    return offerParsed;
  } catch (error) {
    console.error(error)
  }
}

async function sendAnswer() {
  try {
    const backendUri = import.meta.env.VITE_BACKEND_URI_LOCAL
    const payload = {
      answer,
      answerName: 'my-channel',
    }
    const response = await axios.post(`${backendUri}/answer`, payload)
    console.log('success', response?.data?.message)
  } catch (error) {
    console.error(error)
  }
}

document.querySelector('#create-session').addEventListener('click', async () => {
  try {
    // Create an offer
    await createOffer()
    // Send the offer to the API
    await sendOffer()
  } catch (error) {
    console.error(error)
  }
})

document.querySelector('#join-session').addEventListener('click', async () => {
  try {
    // Get the offer from the API
    const newOffer = await getOffer()
    await setOfferFromRemote(newOffer)
    await createAnswer()
    await sendAnswer()
  } catch (error) {
    console.error(error)
  }
})
document.querySelector('#check-db-connection').addEventListener('click', checkDbConnection)

