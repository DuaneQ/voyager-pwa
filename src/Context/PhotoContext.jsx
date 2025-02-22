import { createContext, useState } from 'react';

// Create the PhotoContext
const PhotoContext = createContext();

const PhotoProvider = ({ children }) => {
  const [photos, setPhotos] = useState([]);

  const updatePhotos = (url, index) => {   

    const newPhotos = [...photos];
    newPhotos[index] = url;
    setPhotos(newPhotos);
    console.log('newphotos', newPhotos);
    console.log("pnewphotos2", photos);
      // setPhotos((prevPhotos) => {
      //     const newPhotos = [...prevPhotos];
      //     newPhotos[index] = url;
      //     console.log('newphotos', newPhotos);
      //     console.log("pnewphotos2", photos);

      //     return newPhotos;
      // });
    };

    return (
      <PhotoContext.Provider value={{ updatePhotos, photos }}>
        {children}
      </PhotoContext.Provider>
    );
};

export { PhotoContext, PhotoProvider };
