import { useState } from 'react';

export default function Home() {
  const [text, setText] = useState('');
  const [formattedText, setFormattedText] = useState('');
  const [isReading, setIsReading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setText(e.target.result);
        formatText(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  const formatText = (inputText) => {
    const sentences = inputText
      .split(/([，。？；])/g)
      .reduce((acc, curr, i, arr) => {
        if (i % 2 === 0) {
          const nextItem = arr[i + 1];
          return acc.concat(curr + (nextItem || ''));
        }
        return acc;
      }, [])
      .filter(s => s.trim());
    setFormattedText(sentences);
  };

  const toggleReadingMode = () => {
    setIsReading(!isReading);
    setCurrentIndex(0);
  };

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(formattedText.length - 1, prev + 1));
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      handlePrevious();
    } else if (event.key === 'ArrowRight') {
      handleNext();
    }
  };

  if (isReading && formattedText.length > 0) {
    return (
      <div 
        className="min-h-screen bg-gray-50 flex flex-col items-center justify-center"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className="fixed top-4 left-4">
          <button
            onClick={toggleReadingMode}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            返回上传
          </button>
        </div>
        <div className="fixed top-4 right-4 text-gray-500">
          {currentIndex + 1} / {formattedText.length}
        </div>
        <div className="max-w-3xl mx-auto px-4 flex flex-col items-center">
          <div className="text-2xl md:text-3xl leading-relaxed text-gray-800 text-center font-serif mb-12">
            {formattedText[currentIndex]}
          </div>
          <div className="flex gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className={`px-6 py-2 rounded-lg transition-colors ${
                currentIndex === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              上一句
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === formattedText.length - 1}
              className={`px-6 py-2 rounded-lg transition-colors ${
                currentIndex === formattedText.length - 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              下一句
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h1 className="text-3xl font-bold mb-8 text-center">文本阅读器</h1>
                <div className="mb-8">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    上传TXT文件
                  </label>
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:shadow-outline"
                  />
                </div>
                {formattedText.length > 0 && (
                  <div className="text-center">
                    <button
                      onClick={toggleReadingMode}
                      className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      开始阅读
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 