import './App.css';

import { useRef, useState } from 'react';
import StableDiffusion from './components/StableDiffusion';
import ProjectionMapping from './components/ProjectionMapping';

function App() {
  const webcamRef = useRef();
  const appWrapperRef = useRef();
  const [points, setPoints] = useState([]);

  return (
    <div className="App" >

      <div ref={appWrapperRef} style={{ display: "flex" }} >

        <ProjectionMapping appWrapperRef={appWrapperRef} webcamRef={webcamRef} points={points} setPoints={setPoints} />

        <StableDiffusion webcamRef={webcamRef} points={points} />

      </div>

    </div>
  )
}

export default App;