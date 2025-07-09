// src/components/ProfilePictureEditor/ProfilePictureEditor.tsx
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import styles from './ProfilePictureEditor.module.css';
import { Point, Area } from 'react-easy-crop';

interface ProfilePictureEditorProps {
  imageSrc: string;
  onSave: (croppedImage: Blob) => void;
  onCancel: () => void;
  isUploading: boolean;
}

const ProfilePictureEditor: React.FC<ProfilePictureEditorProps> = ({
  imageSrc,
  onSave,
  onCancel,
  isUploading,
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels || !imageSrc) return;

    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onSave(croppedImage);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.cropperContainer}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="round"
            showGrid={false}
          />
        </div>
        <div className={styles.controls}>
          <label>Zoom</label>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className={styles.slider}
          />
        </div>
        <div className={styles.buttonGroup}>
          <button onClick={onCancel} className={styles.cancelButton} disabled={isUploading}>
            Cancel
          </button>
          <button onClick={handleSave} className={styles.saveButton} disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Save & Upload'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to create a cropped image
const getCroppedImg = (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return Promise.reject(new Error('Canvas context is not available.'));
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    return new Promise((resolve, reject) => {
        image.onload = () => {
            ctx.drawImage(
                image,
                pixelCrop.x,
                pixelCrop.y,
                pixelCrop.width,
                pixelCrop.height,
                0,
                0,
                pixelCrop.width,
                pixelCrop.height
            );
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Canvas is empty'));
                    return;
                }
                resolve(blob);
            }, 'image/jpeg');
        };
        image.onerror = (error) => reject(error);
    });
};


export default ProfilePictureEditor;
