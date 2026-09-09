import React, { useState, useEffect } from "react";

function Timer() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000); 

    return () => clearInterval(interval); 
  }, []);

  return (
    <div>
      <h1 className="bg-red-300 ">{time.toLocaleTimeString()}</h1>
      <p className="bg-red-600">hello </p>
    </div>
  );
}

export default Timer;