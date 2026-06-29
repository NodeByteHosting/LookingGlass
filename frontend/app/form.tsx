"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import BackendSelector from "./selector";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function LookingGlassForm({ config }: any) {
  const [selectedBackend, setSelectedBackend] = useState(
    config.locations[0].backends[0]
  );

  const [ip, setIp] = useState("");
  const [type, setType] = useState("ping");

  const [time, setTime] = useState(0);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBackendChange = (value: string) => {
    const backend = config.locations
      .flatMap((location: any) => location.backends)
      .find((backend: any) => backend.name === value);
    setSelectedBackend(backend);
    setResult("");
  };

  const handleRequest = async (e: any) => {
    e.preventDefault();

    setLoading(true);
    setResult("");

    try {
      const start = new Date().getTime();

      const response = await fetch(
        `/api/lg/${type}?ip=${encodeURIComponent(ip)}&backend=${encodeURIComponent(selectedBackend.name)}`
      );

      const text = await response.text();

      setTime(new Date().getTime() - start);
      setResult(text);
      setLoading(false);
    } catch (e: any) {
      toast.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base sm:text-lg font-semibold mr-auto">
              Looking Glass
            </CardTitle>
            <BackendSelector
              config={config}
              selectedBackend={selectedBackend}
              onBackendChange={handleBackendChange}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedBackend.info && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/50 border border-border/50">
              {[
                { label: "IPv4", value: selectedBackend.info.ipv4 },
                { label: "IPv6", value: selectedBackend.info.ipv6 },
                { label: "Datacenter", value: selectedBackend.info.datacenter },
                { label: "Location", value: selectedBackend.info.location },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-1 min-w-0">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {label}
                  </span>
                  <span className="text-sm font-medium truncate">
                    {value || "Not set"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleRequest} className="flex flex-col sm:flex-row gap-3">
            <Input
              disabled={loading}
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="IP address or domain"
              className="flex-1"
            />
            <div className="flex gap-3 sm:gap-3">
              <Select
                disabled={loading}
                onValueChange={(value) => setType(value)}
                value={type}
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ping">Ping</SelectItem>
                  <SelectItem value="traceroute">Traceroute</SelectItem>
                  <SelectItem value="mtr">MTR</SelectItem>
                  <SelectItem value="bgp">BGP</SelectItem>
                </SelectContent>
              </Select>
              <Button disabled={loading} type="submit" className="w-24 shrink-0">
                {loading ? <Spinner /> : "Run"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card
        className={cn(
          "transition-opacity duration-200",
          result === "" ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base sm:text-lg font-semibold mr-auto">
              Result
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              took <span className="font-medium text-foreground">{time}ms</span>
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto bg-muted/50 border border-border/50 text-sm p-4 rounded-lg font-mono leading-relaxed whitespace-pre-wrap break-words">
            {result}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
