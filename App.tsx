
import React, { useState, useCallback, useMemo } from 'react';
import { Status } from './types';
import { fileToBase64 } from './utils/fileUtils';
import { editImageWithGemini } from './services/geminiService';
import { UploadIcon, SparklesIcon, PhotoIcon } from './components/icons';

// Define components outside the main App component to avoid re-creation on re-renders.

interface ImageUploadProps {
  onImageSelect: (file: File | null) => void;
  previewUrl: string | null;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelect, previewUrl }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    onImageSelect(file || null);
  };

  return (
    <div className="w-full">
      <label htmlFor="file-upload" className="block text-sm font-medium text-gray-300 mb-2">
        Original Image
      </label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md bg-gray-800 hover:border-indigo-500 transition-colors">
        <div className="space-y-1 text-center w-full">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="mx-auto max-h-60 rounded-md" />
          ) : (
            <>
              <UploadIcon className="mx-auto h-12 w-12 text-gray-500" />
              <div className="flex text-sm text-gray-400">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-indigo-400 hover:text-indigo-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 focus-within:ring-indigo-500"
                >
                  <span>Upload a file</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface ResultDisplayProps {
    status: Status;
    imageUrl: string | null;
    error: string | null;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ status, imageUrl, error }) => {
    const content = () => {
        switch (status) {
            case 'loading':
                return (
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-500"></div>
                        <p className="text-gray-400">Gemini is thinking...</p>
                    </div>
                );
            case 'success':
                return imageUrl ? <img src={imageUrl} alt="Generated" className="mx-auto max-h-[80vh] rounded-lg shadow-2xl" /> : null;
            case 'error':
                return <p className="text-red-400 text-center">{error}</p>;
            case 'idle':
            default:
                return (
                    <div className="flex flex-col items-center justify-center text-gray-500 space-y-4">
                       <PhotoIcon className="w-16 h-16" />
                       <h3 className="text-lg font-medium text-gray-300">Your edited image will appear here</h3>
                       <p className="text-sm">Upload an image and provide a prompt to get started.</p>
                    </div>
                );
        }
    }
    return (
        <div className="w-full h-full flex items-center justify-center p-4 bg-gray-900/50 rounded-lg min-h-[400px] lg:min-h-0">
           {content()}
        </div>
    );
};


export default function App() {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (originalImage) {
      return URL.createObjectURL(originalImage);
    }
    return null;
  }, [originalImage]);

  const handleImageSelect = (file: File | null) => {
    setOriginalImage(file);
    setGeneratedImage(null);
    setStatus('idle');
    setError(null);
  };

  const handleSubmit = useCallback(async () => {
    if (!originalImage || !prompt) {
      setError("Please upload an image and provide a prompt.");
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError(null);
    setGeneratedImage(null);

    try {
      const base64Image = await fileToBase64(originalImage);
      const generatedData = await editImageWithGemini(base64Image, originalImage.type, prompt);
      // Assuming the API returns a PNG image. Adjust if needed.
      setGeneratedImage(`data:image/png;base64,${generatedData}`);
      setStatus('success');
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setStatus('error');
    }
  }, [originalImage, prompt]);
  
  const isButtonDisabled = status === 'loading' || !originalImage || !prompt;

  return (
    <div className="bg-gray-900 min-h-screen text-white p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-indigo-600 text-transparent bg-clip-text">
            Gemini Image Editor
          </h1>
          <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">
            Edit your images with the power of AI. Describe the changes you want, and let Gemini bring them to life.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col space-y-6 bg-gray-800/50 p-6 rounded-lg shadow-lg">
            <ImageUpload onImageSelect={handleImageSelect} previewUrl={previewUrl} />
            
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-300">
                Editing Prompt
              </label>
              <textarea
                id="prompt"
                name="prompt"
                rows={4}
                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-white sm:text-sm placeholder-gray-400"
                placeholder="e.g., 'Add a retro filter', 'Make the sky look like a sunset', 'Remove the person in the background'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isButtonDisabled}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all"
            >
              <SparklesIcon className={`-ml-1 mr-3 h-5 w-5 ${status === 'loading' ? 'animate-spin' : ''}`} />
              {status === 'loading' ? 'Generating...' : 'Generate'}
            </button>
          </div>

          <div className="bg-gray-800/50 p-2 rounded-lg shadow-lg flex items-center justify-center">
            <ResultDisplay status={status} imageUrl={generatedImage} error={error} />
          </div>
        </main>
      </div>
    </div>
  );
}
