'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { BottomNav } from '@/components/bottom-nav';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X } from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreview(null);
    setCaption('');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      if (caption) {
        formData.append('caption', caption);
      }

      const response = await fetch('/api/splits/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/split/${data.split.id}`);
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('An error occurred while uploading');
    } finally {
      setUploading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#F4E8D8] mb-4">Please login to upload splits</p>
          <Button onClick={() => router.push('/login')}>Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-black border-b-2 border-[#F4E8D8] z-40 px-4 py-4">
        <h1 className="text-2xl font-bold text-[#FFD700]">Post a Split</h1>
      </header>

      <main className="max-w-screen-md mx-auto p-4">
        {!preview ? (
          <div className="space-y-4">
            {/* Camera capture */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full aspect-square border-2 border-dashed border-[#F4E8D8] rounded-lg flex flex-col items-center justify-center gap-4 hover:border-[#FFD700] transition-colors"
            >
              <Camera size={64} className="text-[#F4E8D8]" />
              <p className="text-[#F4E8D8] font-semibold">Take Photo</p>
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* File upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-square border-2 border-dashed border-[#F4E8D8] rounded-lg flex flex-col items-center justify-center gap-4 hover:border-[#FFD700] transition-colors"
            >
              <Upload size={64} className="text-[#F4E8D8]" />
              <p className="text-[#F4E8D8] font-semibold">Upload Photo</p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview */}
            <div className="relative aspect-square w-full bg-black rounded-lg overflow-hidden border-2 border-[#F4E8D8]">
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-contain"
              />
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 bg-black/80 text-[#F4E8D8] p-2 rounded-full hover:bg-black"
              >
                <X size={24} />
              </button>
            </div>

            {/* Caption */}
            <div>
              <label className="block text-[#F4E8D8] text-sm font-medium mb-2">
                Caption (optional)
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                maxLength={500}
                rows={3}
                className="w-full px-4 py-2 bg-black border-2 border-[#F4E8D8] rounded-lg text-[#F4E8D8] placeholder-[#F4E8D8]/50 focus:outline-none focus:border-[#FFD700] resize-none"
              />
              <p className="text-xs text-[#F4E8D8]/70 mt-1">
                {caption.length}/500
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClear}
                className="flex-1"
                disabled={uploading}
              >
                Clear
              </Button>
              <Button
                onClick={handleUpload}
                className="flex-1"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Post Split'}
              </Button>
            </div>

            {uploading && (
              <div className="bg-[#FFD700]/10 border border-[#FFD700] rounded-lg p-4">
                <p className="text-[#F4E8D8] text-center">
                  Our AI judge is analyzing your split...
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
