import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Alert,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';

// Type definition for Camera ref
type CameraRef = {
  takePictureAsync: (options?: {
    quality?: number;
    base64?: boolean;
    exif?: boolean;
  }) => Promise<{ uri: string }>;
};

interface Language {
  code: string;
  name: string;
  voice: string;
}

const { width, height } = Dimensions.get('window');
const [captions, setCaptions] = useState<Record<string, string>>({});
const [hazardInfo, setHazardInfo] = useState<string | null>(null);




const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', voice: 'en-US' },
  { code: 'hi', name: 'Hindi', voice: 'hi-IN' },
  { code: 'as', name: 'Assamese', voice: 'as-IN' },
  { code: 'bn', name: 'Bengali', voice: 'bn-IN' },
  { code: 'te', name: 'Telugu', voice: 'te-IN' },
  { code: 'ta', name: 'Tamil', voice: 'ta-IN' }
];

const MOCK_DESCRIPTIONS: Record<string, string> = {
  en: "This image shows a beautiful landscape with mountains in the background and a clear blue sky. There are green trees in the foreground and what appears to be a small lake or pond reflecting the scenery.",
  hi: "यह छवि पृष्ठभूमि में पहाड़ों और स्पष्ट नीले आकाश के साथ एक सुंदर परिदृश्य दिखाती है। अग्रभूमि में हरे पेड़ हैं और एक छोटी झील या तालाब दिखाई देता है जो दृश्य को दर्शाता है।",
  as: "এই ছবিখনত পাছফালে পাহাৰ আৰু স্পষ্ট নীলা আকাশৰ সৈতে এক সুন্দৰ প্ৰাকৃতিক দৃশ্য দেখা গৈছে। সন্মুখত সেউজীয়া গছ আছে আৰু এটা সৰু হ্ৰদ বা পুখুৰী আছে যি দৃশ্যটো প্ৰতিফলিত কৰিছে।",
  bn: "এই ছবিতে পটভূমিতে পাহাড় এবং স্বচ্ছ নীল আকাশ সহ একটি সুন্দর প্রাকৃতিক দৃশ্য দেখা যাচ্ছে। সামনের দিকে সবুজ গাছ রয়েছে এবং একটি ছোট হ্রদ বা পুকুর রয়েছে যা দৃশ্যটি প্রতিফলিত করছে।",
  te: "ఈ చిత్రం వెనుకభాగంలో పర్వతాలు మరియు స్పష్టమైన నీలి ఆకాశంతో అందమైన ప్రకృతి దృశ్యాన్ని చూపిస్తుంది. ముందు భాగంలో ఆకుపచ్చ చెట్లు ఉన్నాయి మరియు దృశ్యాన్ని ప్రతిబింబించే చిన్న సరస్సు లేదా చెరువు కనిపిస్తుంది।",
  ta: "இந்த படத்தில் பின்னணியில் மலைகள் மற்றும் தெளிவான நீல வானத்துடன் ஒரு அழகான இயற்கை காட்சி காட்டப்பட்டுள்ளது. முன்புறத்தில் பச்சை மரங்கள் உள்ளன மற்றும் காட்சியை பிரதிபலிக்கும் ஒரு சிறிய ஏரி அல்லது குளம் தெரிகிறது."
};

export default function MultilingualCameraApp() {
  const [currentScreen, setCurrentScreen] = useState<'camera' | 'result'>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [currentLanguageIndex, setCurrentLanguageIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraRef | null>(null);

  const currentLanguage = LANGUAGES[currentLanguageIndex];

  const captureImage = useCallback(async () => {
  if (cameraRef.current) {
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      setCapturedImage(photo.uri);

      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        name: 'image.jpg',
        type: 'image/jpeg',
      } as any);

      const response = await fetch('http://172.20.10.3:8000/analyze-image', {  // Replace with your IP
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();

      // Extract captions from API response
      const extractedCaptions: Record<string, string> = {};
      for (const [lang, data] of Object.entries(result.image_caption)) {
        extractedCaptions[lang] = (data as any).text;
      }

      setCaptions(extractedCaptions);
      setHazardInfo(result.hazard_detection);
      setCurrentScreen('result');
    } catch (error) {
      console.error('Error capturing or sending image:', error);
      Alert.alert('Error', 'Failed to process image');
    }
  }
}, []);



 const speakDescription = useCallback(async () => {
  if (isPlaying) {
    Speech.stop();
    setIsPlaying(false);
  } else {
    try {
      setIsPlaying(true);
      const text = captions[currentLanguage.code] || 'No description available';
      await Speech.speak(text, {
        language: currentLanguage.voice,
        rate: 0.8,
        onDone: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      });
    } catch (error) {
      console.error('Error speaking:', error);
      setIsPlaying(false);
    }
  }
}, [captions, currentLanguage, isPlaying]);


  const returnToCamera = useCallback(() => {
    Speech.stop();
    setIsPlaying(false);
    setCurrentScreen('camera');
    setCapturedImage(null);
  }, []);

  const changeLanguage = useCallback(() => {
    Speech.stop();
    setIsPlaying(false);
    setCurrentLanguageIndex((prev) => (prev + 1) % LANGUAGES.length);
  }, []);

  // Gesture handler for result screen
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > 20 || Math.abs(gestureState.dy) > 20;
    },
    onPanResponderRelease: (evt, gestureState) => {
      const { dx, dy } = gestureState;
      const minSwipeDistance = 50;
      
      if (Math.abs(dx) > minSwipeDistance || Math.abs(dy) > minSwipeDistance) {
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal swipe
          if (dx > 0) {
            // Swipe right - change language
            changeLanguage();
          }
        } else {
          // Vertical swipe
          if (dy < 0) {
            // Swipe up - return to camera
            returnToCamera();
          }
        }
      }
    },
  });

  // Camera screen tap handler
  const handleCameraPress = useCallback(() => {
    captureImage();
  }, [captureImage]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>No access to camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (currentScreen === 'camera') {
    return (
      <TouchableOpacity
        style={styles.cameraContainer}
        onPress={handleCameraPress}
        activeOpacity={1}
      >
        <CameraView
          ref={cameraRef as any}
          style={styles.camera}
          facing="back"
        />
        
        {/* Overlay instructions */}
        <View style={styles.instructionOverlay}>
          <View style={styles.instructionBox}>
            <Text style={styles.instructionText}>Touch anywhere to capture image</Text>
          </View>
        </View>
        
        {/* Camera icon overlay */}
        <View style={styles.cameraIconOverlay}>
          <View style={styles.cameraIconContainer}>
            <Ionicons name="camera" size={32} color="white" />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.resultContainer} {...panResponder.panHandlers}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Image Analysis</Text>
        <View style={styles.languageIndicator}>
          <Text style={styles.languageText}>{currentLanguage.name}</Text>
          <View style={styles.statusDot} />
        </View>
      </View>

      {/* Image Container */}
      <View style={styles.imageContainer}>
        {capturedImage && (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
          </View>
        )}
      </View>

      {/* Description Container */}
      <View style={styles.descriptionContainer}>
        <View style={styles.descriptionWrapper}>
          <View style={styles.descriptionHeader}>
            <Text style={styles.descriptionTitle}>Description</Text>
            <TouchableOpacity
              onPress={speakDescription}
              style={[
                styles.speakButton,
                { backgroundColor: isPlaying ? '#ef4444' : '#3b82f6' }
              ]}
            >
              <Ionicons 
                name={isPlaying ? 'volume-mute' : 'volume-high'} 
                size={20} 
                color="white" 
              />
            </TouchableOpacity>
          </View>
          
        <Text style={styles.descriptionText}>
  {captions[currentLanguage.code] || "No description available for this language."}
</Text>

        </View>
      </View>

      {/* Language Indicator */}
      <View style={styles.languageContainer}>
        <View style={styles.languageBox}>
          <View style={styles.languageInfo}>
            <Text style={styles.languageLabel}>Language:</Text>
            <Text style={styles.currentLanguage}>{currentLanguage.name}</Text>
          </View>
          <View style={styles.languageProgress}>
            {LANGUAGES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressBar,
                  { backgroundColor: index === currentLanguageIndex ? '#3b82f6' : '#d1d5db' }
                ]}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsText}>
            Swipe right to change language • Swipe up to return to camera
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  message: {
    color: 'white',
    fontSize: 16,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  instructionOverlay: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  instructionBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 14,
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  cameraIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 50,
  },
  resultContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  languageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageText: {
    color: 'white',
    fontSize: 14,
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  imageContainer: {
    padding: 16,
  },
  imageWrapper: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  capturedImage: {
    width: '100%',
    height: 200,
  },
  descriptionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flex: 1,
  },
  descriptionWrapper: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  speakButton: {
    padding: 8,
    borderRadius: 20,
  },
  descriptionText: {
    color: '#374151',
    fontSize: 16,
    lineHeight: 24,
  },
  languageContainer: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
  },
  languageBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  languageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  languageLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  currentLanguage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  languageProgress: {
    flexDirection: 'row',
    gap: 4,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  instructionsBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  instructionsText: {
    color: 'white',
    fontSize: 12,
  },
  permissionButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});