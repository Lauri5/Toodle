import React from 'react';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';

import Carousel1 from '../assets/carousel1.png';
import Carousel2 from '../assets/carousel2.png';
import Carousel3 from '../assets/carousel3.png';
import Carousel4 from '../assets/carousel4.png';

const ImageCarousel = () => {
  return (
    <div className="carousel-container">
      <Carousel 
        showThumbs={false}
        showArrows={false}
        showStatus={false}
        showIndicators={true}
        autoPlay
        infiniteLoop
        interval={5000}
        transitionTime={500}
        swipeable={false}
        emulateTouch
        dynamicHeight={false}
        stopOnHover={false}
        className="custom-carousel"
      >
        <div>
          <img 
            src={Carousel1} 
            alt="Carousel 1" 
            draggable="false" 
            className="carousel-image"
          />
        </div>
        <div>
          <img 
            src={Carousel2} 
            alt="Carousel 2" 
            draggable="false" 
            className="carousel-image"
          />
        </div>
        <div>
          <img 
            src={Carousel3} 
            alt="Carousel 3" 
            draggable="false" 
            className="carousel-image"
          />
        </div>
        <div>
          <img 
            src={Carousel4} 
            alt="Carousel 4" 
            draggable="false" 
            className="carousel-image"
          />
        </div>
      </Carousel>
    </div>
  );
};

export default ImageCarousel;
