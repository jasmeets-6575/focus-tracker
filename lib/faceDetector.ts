import type {
  Category,
  Classifications,
  FaceLandmarker as MpFaceLandmarker,
  FaceLandmarkerResult
} from '@mediapipe/tasks-vision';

export type FaceLandmarkerConfig = {
  modelAssetPath?: string;
  wasmRoot?: string;
  minDetectionConfidence?: number;
  minPresenceConfidence?: number;
  minTrackingConfidence?: number;
};

const DEFAULT_MODEL_PATHS = ['/models/face_landmarker.task'];
const DEFAULT_WASM_ROOTS = ['/mediapipe/wasm'];

let landmarkerPromise: Promise<MpFaceLandmarker> | null = null;

function isRemoteAsset(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

function isRemoteAssetAllowed(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_REMOTE_FACE_ASSETS === 'true';
}

function getWasmRootCandidates(configuredWasmRoot?: string): string[] {
  const roots = [
    configuredWasmRoot,
    process.env.NEXT_PUBLIC_FACE_LANDMARKER_WASM_ROOT,
    ...DEFAULT_WASM_ROOTS
  ].filter((value): value is string => Boolean(value && value.trim().length > 0));

  const allowRemote = isRemoteAssetAllowed();
  const filteredRoots = roots.filter((root) => allowRemote || !isRemoteAsset(root));

  return [...new Set(filteredRoots)];
}

function getModelPathCandidates(configuredModelPath?: string): string[] {
  const modelPaths = [
    configuredModelPath,
    process.env.NEXT_PUBLIC_FACE_LANDMARKER_MODEL_URL,
    ...DEFAULT_MODEL_PATHS
  ].filter((value): value is string => Boolean(value && value.trim().length > 0));

  const allowRemote = isRemoteAssetAllowed();
  const filteredModelPaths = modelPaths.filter((modelPath) => allowRemote || !isRemoteAsset(modelPath));

  return [...new Set(filteredModelPaths)];
}

export async function createFaceLandmarker(config: FaceLandmarkerConfig = {}): Promise<MpFaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await import('@mediapipe/tasks-vision');
      const wasmRoots = getWasmRootCandidates(config.wasmRoot);
      const modelAssetPaths = getModelPathCandidates(config.modelAssetPath);
      const delegates: Array<'GPU' | 'CPU'> = ['GPU', 'CPU'];

      if (wasmRoots.length === 0 || modelAssetPaths.length === 0) {
        throw new Error(
          'No allowed face assets found. Use local /public assets or set NEXT_PUBLIC_ALLOW_REMOTE_FACE_ASSETS=true.'
        );
      }

      let lastError: unknown = null;

      for (const wasmRoot of wasmRoots) {
        let resolver: Awaited<ReturnType<typeof vision.FilesetResolver.forVisionTasks>> | null = null;

        try {
          resolver = await vision.FilesetResolver.forVisionTasks(wasmRoot);
        } catch (error) {
          lastError = error;
          continue;
        }

        for (const modelAssetPath of modelAssetPaths) {
          for (const delegate of delegates) {
            try {
              return await vision.FaceLandmarker.createFromOptions(resolver, {
                baseOptions: {
                  modelAssetPath,
                  delegate
                },
                runningMode: 'VIDEO',
                numFaces: 1,
                outputFaceBlendshapes: true,
                minFaceDetectionConfidence: config.minDetectionConfidence ?? 0.6,
                minFacePresenceConfidence: config.minPresenceConfidence ?? 0.6,
                minTrackingConfidence: config.minTrackingConfidence ?? 0.5
              });
            } catch (error) {
              lastError = error;
            }
          }
        }
      }

      if (lastError instanceof Error) {
        throw lastError;
      }

      throw new Error('Unable to initialize face detection model.');
    })();
  }

  try {
    return await landmarkerPromise;
  } catch (error) {
    landmarkerPromise = null;
    throw error;
  }
}

function findBlendshape(categories: Category[], name: string): number {
  const item = categories.find((category) => category.categoryName === name);
  return item?.score ?? 0;
}

function getPrimaryBlendshapes(result: FaceLandmarkerResult): Classifications | null {
  return result.faceBlendshapes[0] ?? null;
}

export function hasDetectedFace(result: FaceLandmarkerResult): boolean {
  return result.faceLandmarks.length > 0;
}

export function getEyeClosureScores(result: FaceLandmarkerResult): { leftEyeClosedScore: number; rightEyeClosedScore: number } {
  const blendshapes = getPrimaryBlendshapes(result);

  if (!blendshapes) {
    return { leftEyeClosedScore: 0, rightEyeClosedScore: 0 };
  }

  return {
    leftEyeClosedScore: findBlendshape(blendshapes.categories, 'eyeBlinkLeft'),
    rightEyeClosedScore: findBlendshape(blendshapes.categories, 'eyeBlinkRight')
  };
}

export function resetFaceDetectorSingleton(): void {
  landmarkerPromise = null;
}
