import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { promises as fs } from "fs";
import Image from "next/image";
import LookingGlassForm from "./form";
import {
  Activity,
  Globe,
  Network,
  Route,
  MapPin,
  Server,
  MousePointerClick,
  TerminalSquare,
  SlidersHorizontal,
  SearchCheck,
} from "lucide-react";

const TOOLS = [
  {
    icon: Activity,
    name: "Ping",
    value: "ping",
    description:
      "Sends ICMP echo requests to measure round-trip latency and packet loss to a target host.",
  },
  {
    icon: Route,
    name: "Traceroute",
    value: "traceroute",
    description:
      "Maps the network path to a destination by recording each hop along the route.",
  },
  {
    icon: Network,
    name: "MTR",
    value: "mtr",
    description:
      "Combines ping and traceroute into a live view of packet loss and latency at every hop.",
  },
  {
    icon: Globe,
    name: "BGP",
    value: "bgp",
    description:
      "Queries BGP routing tables to show how an IP prefix is announced and routed globally.",
  },
];

export default async function LookingGlass() {
  const config = JSON.parse(
    await fs.readFile(process.cwd() + "/config.json", "utf8")
  );

  const totalNodes = config.locations.reduce(
    (sum: number, loc: any) => sum + loc.backends.length,
    0
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-3 flex items-center gap-4">
          <Image
            src={config.brand.logo}
            className={config.brand.invertLogo ? "invert dark:invert-0" : ""}
            width={36}
            height={36}
            alt="Logo"
          />
          <Separator orientation="vertical" className="h-5 opacity-50" />
          <span className="font-medium text-sm sm:text-base truncate">
            {config.brand.name}
          </span>
          <div className="ml-auto shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-8 sm:py-10 space-y-10">
        {/* Hero */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Network Looking Glass
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
            Run real-time network diagnostics from {config.locations.length}{" "}
            {config.locations.length === 1 ? "location" : "locations"} across{" "}
            {totalNodes} {totalNodes === 1 ? "node" : "nodes"}. Use ping,
            traceroute, MTR, or BGP lookups to troubleshoot connectivity and
            inspect routing paths.
          </p>
        </div>

        {/* Form */}
        <LookingGlassForm config={config} />

        {/* Available Nodes */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Available Nodes
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {config.locations.flatMap((location: any) =>
              location.backends.map((backend: any) => (
                <Card
                  key={backend.name}
                  className="bg-card/50 border-border/60"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {backend.name}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                        {location.name}
                      </span>
                    </div>
                    {backend.info && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {[
                          { label: "IPv4", value: backend.info.ipv4 },
                          { label: "IPv6", value: backend.info.ipv6 },
                          {
                            label: "Datacenter",
                            value: backend.info.datacenter,
                          },
                          { label: "Location", value: backend.info.location },
                        ]
                          .filter((f) => f.value)
                          .map(({ label, value }) => (
                            <div key={label} className="min-w-0">
                              <p className="text-xs text-muted-foreground">
                                {label}
                              </p>
                              <p className="text-xs font-medium truncate">
                                {value}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* Tool Guide */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Diagnostic Tools
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {TOOLS.map(({ icon: Icon, name, description }) => (
              <div
                key={name}
                className="flex gap-3 p-4 rounded-xl border border-border/60 bg-card/50"
              >
                <div className="mt-0.5 shrink-0 h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-semibold">{name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 mt-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image
              src={config.brand.logo}
              className={`h-5 w-5 ${config.brand.invertLogo ? "invert dark:invert-0" : ""}`}
              width={20}
              height={20}
              alt="Logo"
            />
            <span className="text-xs text-muted-foreground font-medium">
              {config.brand.name} Looking Glass
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {config.brand.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
