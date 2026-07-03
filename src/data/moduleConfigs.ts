import type { ModuleConfig } from '../types';

const xrayArchitecture = [
  {
    filename: 'models/pneumonia_densenet.py',
    language: 'python',
    code: `import torch
import torch.nn as nn
from monai.networks.nets import DenseNet121
from monai.transforms import (
    Compose, LoadImage, EnsureChannelFirst,
    ScaleIntensityRange, Resize, EnsureType
)

class PneumoniaDenseNet(nn.Module):
    """
    DenseNet-121 backbone customized for binary pneumonia
    classification from chest X-rays. Pretrained on ImageNet
    and fine-tuned on the RSNA Pneumonia dataset.
    """
    def __init__(self, num_classes: int = 2, pretrained: bool = True):
        super().__init__()
        self.backbone = DenseNet121(
            spatial_dims=2,
            in_channels=1,
            out_channels=num_classes,
            pretrained=pretrained
        )
        # Replace classifier head for clinical fine-tuning
        self.backbone.class_layers.out = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(1024, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.2),
            nn.Linear(512, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)

    def get_feature_layer(self) -> str:
        """Return name of final conv layer for Grad-CAM."""
        return 'backbone.features.denseblock4.denselayer16.conv1'

# Preprocessing pipeline (MONAI transforms)
val_transforms = Compose([
    LoadImage(image_only=True),
    EnsureChannelFirst(),
    ScaleIntensityRange(
        a_min=-1024, a_max=512,
        b_min=0.0, b_max=1.0, clip=True
    ),
    Resize(spatial_size=(512, 512)),
    EnsureType()
])`,
  },
];

const xrayGradCam = [
  {
    filename: 'explainability/gradcam_xray.py',
    language: 'python',
    code: `import torch
import numpy as np
import cv2
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image

class ClinicalGradCAM:
    """
    Grad-CAM implementation for chest X-ray explainability.
    Captures gradients from the final dense block of DenseNet-121
    to produce attention maps over pathological lung regions.
    """
    def __init__(self, model, target_layer, use_cuda=True):
        self.model = model
        self.target_layer = target_layer
        self.cam = GradCAM(
            model=model,
            target_layers=[target_layer],
            use_cuda=use_cuda
        )

    def generate(self, input_tensor, target_class=None):
        """
        Generate heatmap overlay for a single image.
        Args:
            input_tensor: preprocessed 1x1xHxW tensor
            target_class: index of class to explain (None = predicted)
        Returns:
            overlay: HxWx3 numpy array (image + heatmap)
            grayscale_cam: HxW numpy array (raw activation)
        """
        self.model.eval()
        targets = None
        if target_class is not None:
            from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
            targets = [ClassifierOutputTarget(target_class)]

        grayscale_cam = self.cam(
            input_tensor=input_tensor,
            targets=targets,
            aug_smooth=True,
            eigen_smooth=False
        )[0]

        # Resize CAM to original image dimensions
        grayscale_cam = cv2.resize(
            grayscale_cam, (512, 512),
            interpolation=cv2.INTER_CUBIC
        )

        # Apply jet colormap and blend
        heatmap = cv2.applyColorMap(
            np.uint8(255 * grayscale_cam), cv2.COLORMAP_JET
        )
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)

        return heatmap, grayscale_cam

    def compute_activation_stats(self, grayscale_cam, threshold=0.5):
        """Compute bounding box and area of high-activation regions."""
        binary = (grayscale_cam > threshold).astype(np.uint8)
        contours, _ = cv2.findContours(
            binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        regions = []
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            area = cv2.contourArea(cnt)
            if area > 50:  # filter noise
                regions.append({
                    'bbox': (x, y, w, h),
                    'area_px': area,
                    'centroid': (x + w//2, y + h//2)
                })
        return regions`,
  },
];

const mriArchitecture = [
  {
    filename: 'models/brain_tumor_resnet.py',
    language: 'python',
    code: `import torch
import torch.nn as nn
from monai.networks.nets import ResNet
from monai.losses import DiceLoss

class BrainTumorResNet(nn.Module):
    """
    3D ResNet-50 adapted for brain tumor classification from
    axial MRI slices. Uses MONAI's medical-pretrained weights
    and a multi-class head for tumor subtyping.
    Classes: glioma, meningioma, pituitary, no_tumor
    """
    def __init__(self, num_classes: int = 4, pretrained: bool = True):
        super().__init__()
        self.backbone = ResNet(
            block='bottleneck',
            layers=[3, 4, 6, 3],
            block_inplanes=ResNet.get_inplanes(),
            spatial_dims=2,
            in_channels=1,
            num_classes=num_classes,
            feed_forward=False
        )
        self.classifier = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(2048, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.4),
            nn.Linear(512, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = self.backbone(x)
        return self.classifier(features)

    def get_gradcam_target(self) -> str:
        return 'backbone.layer4.2.conv3'

class TumorSegmentationNet(nn.Module):
    """
    U-Net for tumor segmentation (Dice coefficient computation).
    Runs in parallel to provide volumetric metrics.
    """
    def __init__(self):
        super().__init__()
        from monai.networks.nets import UNet
        self.unet = UNet(
            spatial_dims=2,
            in_channels=1,
            out_channels=2,
            channels=(64, 128, 256, 512),
            strides=(2, 2, 2),
            num_res_units=2
        )

    def forward(self, x):
        return self.unet(x)`,
  },
];

const mriGradCam = [
  {
    filename: 'explainability/gradcam_mri.py',
    language: 'python',
    code: `import torch
import numpy as np
import cv2
import nibabel as nib
from pytorch_grad_cam import GradCAM, GradCAMPlusPlus

class MRIGradCAMPlusPlus:
    """
    Grad-CAM++ variant for brain MRI tumor explainability.
    Better at handling multiple tumor regions and provides
    sharper localization than standard Grad-CAM.
    """
    def __init__(self, model, target_layer_name='backbone.layer4.2.conv3'):
        self.model = model
        self.target_layer = dict(model.named_modules())[target_layer_name]
        self.cam = GradCAMPlusPlus(
            model=model,
            target_layers=[self.target_layer],
            use_cuda=torch.cuda.is_available()
        )
        self.hooks = {'gradients': None, 'activations': None}

    def _register_hooks(self):
        def forward_hook(module, input, output):
            self.hooks['activations'] = output.detach()

        def backward_hook(module, grad_in, grad_out):
            self.hooks['gradients'] = grad_out[0].detach()

        self.target_layer.register_forward_hook(forward_hook)
        self.target_layer.register_full_backward_hook(backward_hook)

    def generate(self, input_tensor, target_class=None):
        self.model.eval()
        output = self.model(input_tensor)
        pred_class = output.argmax(dim=1) if target_class is None else target_class

        self.model.zero_grad()
        output[0, pred_class].backward()

        gradients = self.hooks['gradients']  # 1xCxHxW
        activations = self.hooks['activations']  # 1xCxHxW

        # Grad-CAM++ weighting
        gradients = gradients[0]  # CxHxW
        activations = activations[0]  # CxHxW

        # Positive gradients weighting
        grad_weights = torch.relu(gradients)
        sum_grad = grad_weights.sum(dim=(1, 2), keepdim=True)
        weights = grad_weights / (sum_grad + 1e-8)

        cam = (weights * activations).sum(dim=0)
        cam = torch.relu(cam)
        cam = cam / (cam.max() + 1e-8)
        cam = cam.cpu().numpy()

        # Resize to input size
        cam = cv2.resize(cam, (input_tensor.shape[-1],
                               input_tensor.shape[-2]))
        return cam

    def estimate_tumor_diameter(self, cam, pixel_spacing_mm=0.5):
        """Estimate maximum tumor diameter from activation map."""
        binary = (cam > 0.5).astype(np.uint8)
        contours, _ = cv2.findContours(
            binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        if not contours:
            return 0.0
        max_diameter = 0
        for cnt in contours:
            (x, y), radius = cv2.minEnclosingCircle(cnt)
            diameter_mm = 2 * radius * pixel_spacing_mm
            max_diameter = max(max_diameter, diameter_mm)
        return max_diameter`,
  },
];

const dermArchitecture = [
  {
    filename: 'models/skin_cancer_efficientnet.py',
    language: 'python',
    code: `import torch
import torch.nn as nn
from efficientnet_pytorch import EfficientNet

class SkinLesionEfficientNet(nn.Module):
    """
    EfficientNet-B4 fine-tuned on the ISIC 2019 dermoscopic
    dataset for multi-class skin lesion classification.
    Classes: melanoma, basal_cell_carcinoma, benign_keratosis,
             melanocytic_nevus, vascular_lesion
    """
    def __init__(self, num_classes: int = 5, pretrained: bool = True):
        super().__init__()
        if pretrained:
            self.backbone = EfficientNet.from_pretrained('efficientnet-b4')
        else:
            self.backbone = EfficientNet.from_name('efficientnet-b4')

        # Freeze early layers, fine-tune from block 5
        for name, param in self.backbone.named_parameters():
            if 'blocks' in name:
                block_num = int(name.split('_')[1].split('.')[0])
                param.requires_grad = block_num >= 5
            else:
                param.requires_grad = True

        in_features = self.backbone._conv_head.out_channels
        self.backbone._fc = nn.Sequential(
            nn.Dropout(p=0.4),
            nn.Linear(in_features, 512),
            nn.ReLU(inplace=True),
            nn.BatchNorm1d(512),
            nn.Dropout(p=0.25),
            nn.Linear(512, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)

    def get_gradcam_target(self) -> str:
        return 'backbone._conv_head'

class ABCDEscorer:
    """
    Rule-based ABCDE scoring system that complements the CNN.
    Provides interpretable dermoscopic criteria.
    """
    @staticmethod
    def compute_asymmetry(mask: np.ndarray) -> float:
        """Asymmetry score: 0 (symmetric) to 1 (highly asymmetric)."""
        h, w = mask.shape
        left = mask[:, :w//2]
        right = np.fliplr(mask[:, w//2:])
        asym_v = np.sum(left != right) / (h * w//2)
        top = mask[:h//2, :]
        bottom = np.flipud(mask[h//2:, :])
        asym_h = np.sum(top != bottom) / (h//2 * w)
        return (asym_v + asym_h) / 2

    @staticmethod
    def compute_border_irregularity(contour) -> float:
        """Border irregularity from compactness ratio."""
        area = cv2.contourArea(contour)
        perimeter = cv2.arcLength(contour, True)
        if perimeter == 0:
            return 0
        compactness = (4 * np.pi * area) / (perimeter ** 2)
        return 1 - compactness  # 0 = smooth, 1 = irregular`,
  },
];

const dermGradCam = [
  {
    filename: 'explainability/gradcam_derm.py',
    language: 'python',
    code: `import torch
import numpy as np
import cv2
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image

class DermGradCAM:
    """
    Grad-CAM for dermoscopic skin lesion classification.
    Highlights regions of the lesion driving the malignancy
    prediction, with special attention to border and color
    irregularities per ABCDE criteria.
    """
    def __init__(self, model):
        self.model = model
        self.target_layer = model.backbone._conv_head
        self.cam = GradCAM(
            model=model,
            target_layers=[self.target_layer],
            use_cuda=torch.cuda.is_available()
        )

    def generate(self, input_tensor, target_class=None):
        self.model.eval()
        with torch.enable_grad():
            output = self.model(input_tensor)
            pred_class = output.argmax(dim=1) if target_class is None \\
                else target_class

            from pytorch_grad_cam.utils.model_targets import \\
                ClassifierOutputTarget
            targets = [ClassifierOutputTarget(pred_class)]

            grayscale_cam = self.cam(
                input_tensor=input_tensor,
                targets=targets
            )[0]

        # Enhance contrast for dermoscopic visualization
        grayscale_cam = np.power(grayscale_cam, 0.8)
        grayscale_cam = cv2.resize(grayscale_cam, (380, 380))

        # Create colored heatmap
        heatmap = cv2.applyColorMap(
            np.uint8(255 * grayscale_cam), cv2.COLORMAP_JET
        )
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)

        return heatmap, grayscale_cam

    def analyze_lesion_features(self, cam, original_image):
        """
        Extract dermoscopic features from activation map.
        Returns ABCDE-relevant metrics for clinical report.
        """
        # Threshold to find lesion ROI
        binary = (cam > 0.4).astype(np.uint8)
        contours, _ = cv2.findContours(
            binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        features = {}
        if contours:
            largest = max(contours, key=cv2.contourArea)
            area = cv2.contourArea(largest)
            x, y, w, h = cv2.boundingRect(largest)

            features['lesion_area_px'] = area
            features['lesion_diameter_px'] = max(w, h)
            features['border_irregularity'] = self._compactness(largest)
            features['color_variegation'] = self._color_std(
                original_image, binary
            )
            features['asymmetry_score'] = self._asymmetry(binary)

        return features

    def _compactness(self, contour):
        area = cv2.contourArea(contour)
        perimeter = cv2.arcLength(contour, True)
        return 1 - (4 * np.pi * area) / (perimeter ** 2 + 1e-8)

    def _color_std(self, image, mask):
        masked = image[mask > 0]
        return float(np.std(masked.mean(axis=1))) if len(masked) > 0 else 0

    def _asymmetry(self, mask):
        h, w = mask.shape
        left = mask[:, :w//2]
        right = np.fliplr(mask[:, w//2:])
        return float(np.sum(left != right) / (h * w//2))`,
  },
];

export const moduleConfigs: ModuleConfig[] = [
  {
    id: 'xray',
    name: 'Chest X-Ray Analysis',
    shortName: 'Chest X-Ray',
    modality: 'Chest Radiograph (PA/AP)',
    icon: 'Stethoscope',
    accentColor: 'med',
    classes: ['Normal', 'Pneumonia'],
    samples: [
      {
        id: 'xray-001',
        label: 'Case #104: Normal',
        description: 'Clear bilateral lung fields, no active cardiopulmonary pathology',
        imageUrl: '',
        groundTruth: 'Normal',
        difficulty: 'Routine',
      },
      {
        id: 'xray-002',
        label: 'Case #209: Lobar Pneumonia',
        description: 'Right lower lobe consolidation with air bronchograms',
        imageUrl: '',
        groundTruth: 'Pneumonia',
        difficulty: 'Routine',
      },
      {
        id: 'xray-003',
        label: 'Case #312: Multifocal Opacity',
        description: 'Bilateral patchy infiltrates, borderline for atypical infection',
        imageUrl: '',
        groundTruth: 'Pneumonia',
        difficulty: 'Borderline',
      },
    ],
    modelArchitecture: xrayArchitecture,
    gradCamScript: xrayGradCam,
    defaultResult: {
      primaryClass: 'Normal',
      confidence: 0,
      classProbabilities: [],
      metrics: [],
      explainability: [],
      heatmapRegions: [],
      inferenceTimeMs: 0,
    },
  },
  {
    id: 'mri',
    name: 'Brain MRI Classification',
    shortName: 'Brain MRI',
    modality: 'T1-weighted Axial MRI',
    icon: 'Brain',
    accentColor: 'electric',
    classes: ['Glioma', 'Meningioma', 'Pituitary', 'No Tumor'],
    samples: [
      {
        id: 'mri-001',
        label: 'Case #051: No Tumor',
        description: 'Normal brain parenchyma, symmetric ventricles, no mass effect',
        imageUrl: '',
        groundTruth: 'No Tumor',
        difficulty: 'Routine',
      },
      {
        id: 'mri-002',
        label: 'Case #178: Glioma',
        description: 'Irregular mass in right temporal lobe with peritumoral edema',
        imageUrl: '',
        groundTruth: 'Glioma',
        difficulty: 'Complex',
      },
      {
        id: 'mri-003',
        label: 'Case #294: Meningioma',
        description: 'Well-circumscribed extra-axial mass in left frontal convexity',
        imageUrl: '',
        groundTruth: 'Meningioma',
        difficulty: 'Routine',
      },
    ],
    modelArchitecture: mriArchitecture,
    gradCamScript: mriGradCam,
    defaultResult: {
      primaryClass: 'No Tumor',
      confidence: 0,
      classProbabilities: [],
      metrics: [],
      explainability: [],
      heatmapRegions: [],
      inferenceTimeMs: 0,
    },
  },
  {
    id: 'derm',
    name: 'Dermatoscopic Skin Analysis',
    shortName: 'Dermatology',
    modality: 'Polarized Dermoscopy',
    icon: 'Microscope',
    accentColor: 'warning',
    classes: ['Melanocytic Nevus', 'Melanoma', 'Basal Cell Carcinoma', 'Benign Keratosis', 'Vascular Lesion'],
    samples: [
      {
        id: 'derm-001',
        label: 'Case #067: Benign Nevus',
        description: 'Symmetric pigmented lesion with regular borders, uniform color',
        imageUrl: '',
        groundTruth: 'Melanocytic Nevus',
        difficulty: 'Routine',
      },
      {
        id: 'derm-002',
        label: 'Case #203: Melanoma',
        description: 'Asymmetric lesion with irregular borders and color variegation',
        imageUrl: '',
        groundTruth: 'Melanoma',
        difficulty: 'Complex',
      },
      {
        id: 'derm-003',
        label: 'Case #388: BCC',
        description: 'Pearly papule with arborizing telangiectasia on sun-exposed skin',
        imageUrl: '',
        groundTruth: 'Basal Cell Carcinoma',
        difficulty: 'Borderline',
      },
    ],
    modelArchitecture: dermArchitecture,
    gradCamScript: dermGradCam,
    defaultResult: {
      primaryClass: 'Melanocytic Nevus',
      confidence: 0,
      classProbabilities: [],
      metrics: [],
      explainability: [],
      heatmapRegions: [],
      inferenceTimeMs: 0,
    },
  },
];
