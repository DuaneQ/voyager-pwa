import { createContext, useState } from 'react';

const PhotoContext = createContext();

const PhotoProvider = ({ children }) => {
  const [photos, setPhotos] = useState([]);

  const updatePhotos = async (url, index) => {   
    const newPhotos = [...photos];
    newPhotos[index] = url;
    setPhotos(newPhotos);
    };

    return (
      <PhotoContext.Provider value={{ updatePhotos, photos }}>
        {children}
      </PhotoContext.Provider>
    );
};

export { PhotoContext, PhotoProvider };
