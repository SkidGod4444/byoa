import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // TODO: point at the real production domain before deploying.
  metadataBase: new URL("https://byoa.app"),
  title: {
    default: "BYOA — Build Your Own Actuators",
    template: "%s · BYOA",
  },
  description:
    "An interactive 3D playground for learning how robot actuators work. Click every part of a living machine — rotor, planets, flexspline — explode it like an anatomy diagram, stack your own gear stages, and read real torque, speed and efficiency. Includes real actuators from MIT Mini-Cheetah, OpenArm, Dynamixel and more. Best on a desktop.",
  keywords: [
    "robot actuator",
    "robotics education",
    "gearbox simulator",
    "planetary gear",
    "harmonic drive",
    "quasi-direct drive",
    "OpenArm",
    "BLDC motor",
    "3D interactive learning",
  ],
  openGraph: {
    type: "website",
    siteName: "BYOA",
    title: "BYOA — Build Your Own Actuators",
    description:
      "Dissect a living 3D robot actuator: click parts, explode the machine, stack gear stages, and learn the physics behind real hardware like OpenArm and MIT's Mini Cheetah.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BYOA — Build Your Own Actuators",
    description:
      "An interactive 3D anatomy lab for robot actuators — real involute gears, real physics, real hardware presets.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
