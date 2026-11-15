import Chapter01 from '../chapters/chapter-01/Chapter01.jsx'
import Chapter02 from '../chapters/chapter-02/Chapter02.jsx'
import Chapter03 from '../chapters/chapter-03/Chapter03.jsx'
import Chapter04 from '../chapters/chapter-04/Chapter04.jsx'
import Chapter05 from '../chapters/chapter-05/Chapter05.jsx'
import Chapter06 from '../chapters/chapter-06/Chapter06.jsx'
import Chapter07 from '../chapters/chapter-07/Chapter07.jsx'
import Chapter08 from '../chapters/chapter-08/Chapter08.jsx'
import Chapter09 from '../chapters/chapter-09/Chapter09.jsx'
import Chapter10 from '../chapters/chapter-10/Chapter10.jsx'

const storyChapters = [
  Chapter01,
  Chapter02,
  Chapter03,
  Chapter04,
  Chapter05,
  Chapter06,
  Chapter07,
  Chapter08,
  Chapter09,
]

const storyDetails = [
  {
    title: 'The Dream Begins',
    paragraphs: [
      'Akaay was a boy who loved space. One night, after watching a cartoon about space, he fell asleep. Suddenly, he opened his eyes and found himself floating in a dark, starry space.',
    ],
    nasaData: {
      fact: 'Astronauts on the International Space Station seem to float because the station and everyone inside are in constant free fall around Earth.',
      url: 'https://www.nasa.gov/international-space-station/',
    },
  },
  {
    title: 'Meet Atlas',
    paragraphs: [
      'A mysterious figure appeared. He wore a black fedora and had a caring smile. “Don’t be afraid,” he said. “My name is Atlas, and I’m here to show you the wonders of space!”',
    ],
    nasaData: {
      fact: 'NASA publishes real telescope images and discoveries about stars, galaxies and planets for everyone to explore.',
      url: 'https://science.nasa.gov/universe/',
    },
  },
  {
    title: 'The Red Planet',
    paragraphs: [
      'Atlas held Akaay’s hand, and suddenly they were standing on Mars. “Look over there,” Atlas said. They saw the rovers Spirit and Opportunity. “These are the rovers we left on Mars to explore,” Atlas explained. Akaay was amazed!',
    ],
    nasaData: {
      fact: 'NASA’s rovers Spirit and Opportunity landed on Mars in January 2004. Opportunity kept working until 2018, far longer than its planned 90 days.',
      url: 'https://science.nasa.gov/mars/',
    },
  },
  {
    title: 'The Eye in the Sky',
    paragraphs: [
      'They traveled further into space. Atlas showed him the Hubble Space Telescope. “It’s a giant eye in space that takes beautiful pictures of stars and galaxies,” Atlas said.',
    ],
    nasaData: {
      fact: 'The Hubble Space Telescope launched in 1990 and has been observing the universe for more than three decades.',
      url: 'https://science.nasa.gov/mission/hubble/',
    },
  },
  {
    title: 'The Golden Record',
    paragraphs: [
      'They floated deeper into space and saw Voyager 1 and Voyager 2. “These probes were launched in 1977. They carry a Golden Record with sounds and greetings from Earth,” Atlas said. Akaay’s mouth dropped open in awe.',
    ],
    nasaData: {
      fact: 'Voyager 1 and Voyager 2 launched in 1977. Each carries a Golden Record, and Voyager 1 is now in interstellar space.',
      url: 'https://science.nasa.gov/mission/voyager/',
    },
  },
  {
    title: 'The First Visitors',
    paragraphs: [
      'Next, they saw the Viking 1 and Viking 2 landers. “These were the first spacecraft to successfully land on Mars and send back pictures of the red surface,” Atlas explained.',
    ],
    nasaData: {
      fact: 'NASA’s Viking 1 and Viking 2 landers touched down on Mars in 1976 and sent back the first close-up pictures from its surface.',
      url: 'https://science.nasa.gov/mars/',
    },
  },
  {
    title: 'The Pioneers',
    paragraphs: [
      'Suddenly, two small spacecraft appeared. “These are Pioneer 10 and Pioneer 11. They were the first to fly past Jupiter and Saturn, carrying a special golden plaque,” Atlas said.',
    ],
    nasaData: {
      fact: 'Pioneer 10 flew past Jupiter in 1973 and Pioneer 11 flew past Saturn in 1979. Each carries a gold-coloured plaque with a message from humankind.',
      url: 'https://science.nasa.gov/mission/pioneer-10/',
    },
  },
  {
    title: 'The Eagle',
    paragraphs: [
      'Finally, they visited the Moon. “Look at that,” Atlas pointed. It was the Apollo Lunar Module. “It stayed behind after humans walked on the Moon. It is a monument to human history,” Atlas said.',
    ],
    nasaData: {
      fact: 'Apollo 11 landed on the Moon in July 1969 at Tranquility Base, and the lunar module’s descent stage is still there.',
      url: 'https://www.nasa.gov/mission/apollo-11/',
    },
  },
  {
    title: 'Waking Up',
    paragraphs: [
      '“But wait,” Akaay said. “If I wake up, will I ever see you again?” Atlas laughed. “I’m a cosmic entity! I promise we will meet every time you dream.” They shook hands.',
      'Suddenly, Akaay woke up in his bed. He felt a little sad that it was only a dream, but his heart was full of joy from the wonderful adventure. He looked at his toy spaceship next to his bed and smiled. It was his own little rescue ship. “Welp. That was fun!” he whispered.',
    ],
    nasaData: {
      fact: 'NASA Space Place has free space science games and activities for kids.',
      url: 'https://spaceplace.nasa.gov/',
    },
  },
  {
    title: 'Puzzle Quiz',
    paragraphs: [
      'The journey through space leaves infinite puzzles to solve. Across distant craters and silent valleys, the footprints of humanity’s robotic pioneers invite curious minds to decode their cosmic paths.',
    ],
    nasaData: {
      fact: 'NASA Citizen Science projects let anyone explore real space discoveries and contribute to scientific research.',
      url: 'https://science.nasa.gov/citizen-science/',
    },
  },
]

const chaptersWithVideo = new Set([1])

export const chapters = Array.from({ length: 10 }, (_, index) => {
  const number = index + 1
  const id = String(number).padStart(2, '0')
  const isPuzzleChapter = number === 10
  const details = storyDetails[index]

  return {
    id,
    number,
    title: details?.title || (isPuzzleChapter ? 'Puzzle Chapter' : null),
    kind: isPuzzleChapter ? 'puzzle' : 'story',
    Content: isPuzzleChapter ? Chapter10 : (storyChapters[index] || Chapter10),
    ...(details || {}),
    audio: `/media/chapter-${id}/audio/narration.mp3`,
    media: {
      type: 'image',
<<<<<<< HEAD
      src: `/media/chapter-${id}/images/chapter${number}.jpeg`,
      ...(chaptersWithVideo.has(number) ? {
        video: `/media/chapter-${id}/videos/chapter-${id}.mp4`,
      } : {}),
=======
      src: `/media/chapter-${id}/images/chapter-${id}.jpeg`,
      video: `/media/chapter-${id}/videos/chapter-${id}.mp4`,
>>>>>>> e74a871ce3aa1b07f4a9fd5fc3d17e9b2d7e3e72
    },
  }
})

export const getChapterById = (id) => chapters.find((chapter) => chapter.id === id)