"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download } from 'lucide-react';

const AudioVisualizer = () => {
  const [dots, setDots] = useState([]);
  const [draggedDotIndex, setDraggedDotIndex] = useState(null);
  const [dotDistances, setDotDistances] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [centerDot, setCenterDot] = useState({ x: 400, y: 300, color: 'red', size: 2 });
  const [isHighlighted, setIsHighlighted] = useState(false);
  const canvasRef = useRef(null);
  const menuRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [waveformData, setWaveformData] = useState([]);
  const audioRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 20, 0.01)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw regular dots
      dots.forEach((dot, index) => {
        const time = Date.now() * 0.001;
        const size = 10 + Math.sin(time + index) * 2.5; // Pulsing effect

        var radgrad = ctx.createRadialGradient(60, 60, 0, 60, 60, 60);
        radgrad.addColorStop(0, 'rgba(255,0,0,1)');
        radgrad.addColorStop(0.8, 'rgba(228,0,0,.9)');
        radgrad.addColorStop(1, 'rgba(228,0,0,0)');

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, size, 0, 2 * Math.PI);
        ctx.fillStyle = dot.color;
        ctx.fill();
      });

      // Draw center dot
      ctx.beginPath();
      ctx.arc(centerDot.x, centerDot.y, centerDot.size, 0, 2 * Math.PI);
      ctx.fillStyle = centerDot.color;
      ctx.fill();

      if (isHighlighted) {
        ctx.beginPath();
        ctx.arc(centerDot.x, centerDot.y, centerDot.size + 5, 0, 2 * Math.PI);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [dots, centerDot, isHighlighted]);

  const updateCenterDotColor = () => {
    if (dots.length === 0) return;

    let totalR = 0, totalG = 0, totalB = 0, totalWeight = 0;

    dots.forEach(dot => {
      const distance = Math.sqrt((dot.x - centerDot.x) ** 2 + (dot.y - centerDot.y) ** 2);
      const weight = 1 / (distance); // Adding 1 to avoid division by zero
      const [r, g, b] = dot.color.match(/\d+/g).map(Number);
      console.log(r, g, b)

      totalR += r * weight;
      totalG += g * weight;
      totalB += b * weight;
      totalWeight += weight;
    });

    const avgR = Math.round(totalR / totalWeight);
    const avgG = Math.round(totalG / totalWeight);
    const avgB = Math.round(totalB / totalWeight);

    console.log("avgs", avgR, avgG, avgB)

    setCenterDot(prev => ({ ...prev, color: `rgb(${avgR}, ${avgG}, ${avgB})` }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const hue = Math.random() * 60 + 180; // Blue to purple range
      const color = `hsla(${hue}, 70%, 50%, 0.8)`;
      const audio = new Audio(URL.createObjectURL(file));
      setDots([...dots, { x, y, color, audio, isPlaying: false, name: file.name }]);
    }
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedDotIndex = dots.findIndex(dot =>
      Math.sqrt((dot.x - x) ** 2 + (dot.y - y) ** 2) < 20
    );

    if (clickedDotIndex !== -1) {
      setDraggedDotIndex(clickedDotIndex);
    }
  };

  const handleMouseMove = (e) => {
    if (draggedDotIndex !== null) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setDots(dots.map((dot, index) =>
        index === draggedDotIndex ? { ...dot, x, y } : dot
      ));
    }
  };

  const handleMouseUp = () => {
    setDraggedDotIndex(null);
  };

  const preventDefault = (e) => {
    e.preventDefault();
  };

  const toggleDotPlay = (index) => {
    setDots(dots.map((dot, i) => {
      if (i === index) {
        if (dot.isPlaying) {
          dot.audio.pause();
        } else {
          dot.audio.play().catch(e => console.error("Audio playback failed", e));
        }
        return { ...dot, isPlaying: !dot.isPlaying };
      }
      return dot;
    }));
  };

  const handleDotClick = (index) => {
    setActiveMenu(activeMenu === index ? null : index);
  };


  const handleGenerate = () => {
    setIsLoading(true);
    const totalDistance = dots.reduce((sum, dot) =>
      sum + Math.sqrt((dot.x - centerDot.x) ** 2 + (dot.y - centerDot.y) ** 2), 0);

    const distances = dots.map((dot, index) => {
      const distance = Math.sqrt((dot.x - centerDot.x) ** 2 + (dot.y - centerDot.y) ** 2);
      const percentage = ((distance / totalDistance) * 100).toFixed(2);
      return `Dot ${index + 1}: ${percentage}%`;
    });

    setDotDistances(distances.join('\n'));
    setIsHighlighted(true);
    setCenterDot(prev => ({ ...prev, size: 20 }));

    // Simulate audio generation
    setTimeout(() => {
      setIsLoading(false);
      // For demonstration, we'll use a sample audio file
      setGeneratedAudio('/path/to/sample/audio.mp3');
      loadAudio('/path/to/sample/audio.mp3');
    }, 1000);
  };

  const loadAudio = async (url) => {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    setAudioContext(context);

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    setAudioBuffer(audioBuffer);

    // Generate waveform data
    const channelData = audioBuffer.getChannelData(0);
    const segments = 100;
    const segmentLength = Math.floor(channelData.length / segments);
    const waveform = [];
    for (let i = 0; i < segments; i++) {
      const start = i * segmentLength;
      const end = start + segmentLength;
      const max = Math.max(...channelData.slice(start, end));
      waveform.push(max);
    }
    setWaveformData(waveform);
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = generatedAudio;
    link.download = 'generated_audio.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div>
      <div
        className="relative border-4 border-dashed border-gray-600 rounded-lg p-4"
        onDrop={handleDrop}
        onDragOver={preventDefault}
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="bg-transparent"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={(e) => {
            const rect = canvasRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const clickedDotIndex = dots.findIndex(dot =>
              Math.sqrt((dot.x - x) ** 2 + (dot.y - y) ** 2) < 20
            );
            if (clickedDotIndex !== -1) {
              handleDotClick(clickedDotIndex);
            } else {
              setActiveMenu(null);
            }
          }}
        />
        {activeMenu !== null && (
          <div
            ref={menuRef}
            className="absolute bg-transparent rounded p-2 shadow-lg z-10"
            style={{
              left: `${dots[activeMenu].x}px`,
              top: `${dots[activeMenu].y + 30}px`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="text-white text-sm mb-1">{dots[activeMenu].name}</div>
            <button
              className="p-1 bg-white rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                toggleDotPlay(activeMenu);
              }}
            >
              {dots[activeMenu].isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
          </div>
        )}
      </div>

      <p className="mt-4 text-gray-400">Drag and drop audio files onto the canvas</p>
      <button
        className="mt-4 px-4 py-2 bg-[#0141ff] text-white rounded hover:bg-blue-600"
        onClick={handleGenerate}
        disabled={isLoading}
      >
        {isLoading ? 'Generating...' : 'Generate'}
      </button>

      {isLoading && (
        <div className="mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {generatedAudio && (
        <div className="mt-4 p-4 bg-gray-800 text-gray-200 rounded">
          <div className="flex items-center justify-between mb-2">
            <button
              className="p-2 bg-[#0141ff] text-white rounded-full"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              className="p-2 bg-green-500 text-white rounded-full"
              onClick={handleDownload}
            >
              <Download size={20} />
            </button>
          </div>
          <div className="h-24 bg-gray-700 rounded">
            {waveformData.length > 0 && (
              <svg width="100%" height="100%" preserveAspectRatio="none">
                <path
                  d={`M 0 ${24} ${waveformData.map((point, index) =>
                    `L ${index * (100 / waveformData.length)}% ${24 - point * 24}`).join(' ')}`}
                  stroke="white"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            )}
          </div>
          <audio ref={audioRef} src={generatedAudio} onEnded={() => setIsPlaying(false)} />
        </div>
      )}

      {dotDistances && (
        <pre className="mt-4 p-4 bg-gray-800 text-gray-200 rounded">
          {dotDistances}
        </pre>
      )}
    </div>
  );
};

export default AudioVisualizer;
