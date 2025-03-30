import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const troopTypes = ["Infantry", "Lancer", "Marksman"];

const priorityOptions = [
  { label: "Infantry → Lancer → Marksman", value: "0,1,2" },
  { label: "Lancer → Marksman → Infantry", value: "1,2,0" },
  { label: "Marksman → Lancer → Infantry", value: "2,1,0" },
  { label: "Lancer → Infantry → Marksman", value: "1,0,2" },
  { label: "Infantry → Marksman → Lancer", value: "0,2,1" },
  { label: "Marksman → Infantry → Lancer", value: "2,0,1" },
];

const defaultConfigs: Record<string, { percentages: number[]; priority: string }> = {
  PVE: { percentages: [50, 20, 30], priority: "0,2,1" },
  Bear: { percentages: [10, 10, 80], priority: "2,1,0" },
  Garrison: { percentages: [40, 40, 20], priority: "0,1,2" },
  "Small Guarison": { percentages: [20, 20, 10], priority: "0,1,2" },
  Custom: { percentages: [10, 10, 80], priority: "0,1,2" },
};

export default function FrostyAllocationUI() {
  const [tab, setTab] = useState("PVE");
  const [available, setAvailable] = useState([0, 0, 0]);
  const [sharedAvailable, setSharedAvailable] = useState([0, 0, 0]);
  const [percentages, setPercentages] = useState(defaultConfigs[tab].percentages);
  const [priority, setPriority] = useState(defaultConfigs[tab].priority);
  const [leaderTruck, setLeaderTruck] = useState(0);
  const [trucks, setTrucks] = useState([0]);

  useEffect(() => {
    const stored = localStorage.getItem(`frosty_state_${tab}`);
    if (stored) {
      const { available, percentages, priority, leaderTruck, trucks } = JSON.parse(stored);
      setAvailable(available);
      setPercentages(percentages);
      setPriority(priority);
      setLeaderTruck(leaderTruck);
      setTrucks(trucks);
    } else {
      setPercentages(defaultConfigs[tab].percentages);
      setPriority(defaultConfigs[tab].priority);
      setAvailable(sharedAvailable);
      setLeaderTruck(leaderTruck);
      setTrucks(trucks);
    }
  }, [tab]);

  useEffect(() => {
    localStorage.setItem(
      `frosty_state_${tab}`,
      JSON.stringify({ available, percentages, priority, leaderTruck, trucks })
    );
    setSharedAvailable(available);
  }, [available, percentages, priority, leaderTruck, trucks, tab]);

  const priorityArray = priority.split(",").map(Number);
  const totalCapacity = leaderTruck + trucks.reduce((a, b) => a + b, 0);
  const nonLeaderCapacity = totalCapacity - leaderTruck;
  const targetRatio = percentages.map((p) => p / 100);

  const leaderAllocations = [0, 0, 0];
  let leaderCapacityLeft = leaderTruck;
  const availableForLeader = [...available];

  for (let i = 0; i < 3 && leaderCapacityLeft > 0; i++) {
    const idx = priorityArray[i];
    const targetAmount = Math.floor(targetRatio[idx] * leaderTruck);
    const alloc = Math.min(targetAmount, availableForLeader[idx], leaderCapacityLeft);
    leaderAllocations[idx] += alloc;
    availableForLeader[idx] -= alloc;
    leaderCapacityLeft -= alloc;
  }

  const remainingAvailable = available.map((amt, i) => amt - leaderAllocations[i]);
  const totalRatio = percentages.reduce((a, b) => a + b, 0);
  const normalizedRatio = percentages.map((p) => p / totalRatio);
  const baseAllocations = normalizedRatio.map((r) => Math.floor(r * nonLeaderCapacity));
  const adjustedAllocations = [0, 0, 0];
  let capacityLeft = nonLeaderCapacity;
  let availableCopy = [...remainingAvailable];

  for (let i = 0; i < 3; i++) {
    const alloc = Math.min(baseAllocations[i], availableCopy[i]);
    adjustedAllocations[i] += alloc;
    availableCopy[i] -= alloc;
    capacityLeft -= alloc;
  }

  for (let i = 0; i < 3 && capacityLeft > 0; i++) {
    const idx = priorityArray[i];
    const alloc = Math.min(capacityLeft, availableCopy[idx]);
    adjustedAllocations[idx] += alloc;
    availableCopy[idx] -= alloc;
    capacityLeft -= alloc;
  }

  const adjustedPercentages = adjustedAllocations.map(
    (a) => ((a / nonLeaderCapacity) * 100).toFixed(1)
  );

  const getMarchAllocation = (truckSize: number) => {
    const remaining = available.map((amt, i) => amt - leaderAllocations[i]);
    const marchAlloc = [0, 0, 0];
    let tempRemaining = [...remaining];
    let capacityLeft = truckSize;

    for (let i = 0; i < 3 && capacityLeft > 0; i++) {
      const idx = priorityArray[i];
      const portion = Math.min(
        Math.floor((adjustedAllocations[idx] / nonLeaderCapacity) * truckSize),
        tempRemaining[idx],
        capacityLeft
      );
      marchAlloc[idx] += portion;
      tempRemaining[idx] -= portion;
      capacityLeft -= portion;
    }

    return marchAlloc;
  };

  const selectedPriorityLabel = priorityOptions.find((opt) => opt.value === priority)?.label || "Select Priority";

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const formatNumber = (value: number) => isNaN(value) ? "" : value.toLocaleString();

  return (
    <div className="min-h-screen bg-[#f7faff] p-4 md:p-10 text-[#1e3a8a] font-sans">
      <h1 className="text-3xl font-bold mb-6 text-center">Troop Allocation Planner</h1>

      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList className="flex flex-wrap gap-2 justify-center">
          {Object.keys(defaultConfigs).map((key) => (
            <TabsTrigger key={key} value={key}>{key}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-6">
          <Card className="bg-white/60 backdrop-blur rounded-2xl p-6 shadow">
            <CardContent className="space-y-4">
              <h2 className="text-xl font-semibold">Available Troops</h2>
              {troopTypes.map((type, index) => (
                <div key={index}>
                  <label className="block font-medium text-gray-700 mb-1">{type}:</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={formatNumber(available[index])}
                    onFocus={handleInputFocus}
                    onChange={(e) => {
                      const updated = [...available];
                      updated[index] = Number(e.target.value.replace(/,/g, ""));
                      setAvailable(updated);
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur rounded-2xl p-6 shadow">
            <CardContent className="space-y-4">
              <h2 className="text-xl font-semibold">Target Percentages</h2>
              {troopTypes.map((type, index) => (
                <div key={index}>
                  <label className="block font-medium text-gray-700 mb-1">
                    {type} Target: {percentages[index]}%
                  </label>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      const updated = [...percentages];
                      updated[index] = Math.max(0, updated[index] - 1);
                      setPercentages(updated);
                    }}>−</Button>
                    <Slider
                      value={[percentages[index]]}
                      onValueChange={(val) => {
                        const newValue = val[0];
                        const updated = [...percentages];
                        updated[index] = newValue;
                        setPercentages(updated);
                      }}
                      min={0}
                      max={100}
                      step={10}
                      detents={true}
                      className="flex-1"
                    />
                    <Button size="sm" variant="outline" onClick={() => {
                      const updated = [...percentages];
                      updated[index] = Math.min(100, updated[index] + 1);
                      setPercentages(updated);
                    }}>+</Button>
                  </div>
                </div>
              ))}
              {tab === "Custom" && (
                <div>
                  <label className="block font-semibold mb-1">Priority Order</label>
                  <Select value={priority} onValueChange={(val) => setPriority(val)}>
                    <SelectTrigger className="bg-white/70">
                      <SelectValue>{selectedPriorityLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur rounded-2xl p-6 shadow">
            <CardContent className="space-y-4">
              <h2 className="text-xl font-semibold">Adjusted Allocations</h2>
              {troopTypes.map((type, index) => (
                <div key={index} className="text-sm text-gray-800">
                  {type}: {adjustedAllocations[index].toLocaleString()} / {available[index].toLocaleString()} ({adjustedPercentages[index]}%)
                  <div className="w-full bg-blue-100 rounded h-2 mt-1">
                    <div
                      className="bg-blue-500 h-2 rounded"
                      style={{ width: `${adjustedPercentages[index]}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              <div className="text-sm text-gray-600 mt-2">
                Total Capacity: {totalCapacity.toLocaleString()} | Remaining Capacity: {capacityLeft.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-white/60 backdrop-blur rounded-2xl p-6 shadow">
            <CardContent className="space-y-4">
              <h2 className="text-xl font-semibold">March Input</h2>
              <div className="space-y-1">
                <label className="block font-medium">
                  Rally Caller March Size: <span className="text-sm text-gray-700">{leaderAllocations[0].toLocaleString()} → {leaderAllocations[1].toLocaleString()} → {leaderAllocations[2].toLocaleString()}</span>
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={formatNumber(leaderTruck)}
                  onFocus={handleInputFocus}
                  onChange={(e) => setLeaderTruck(Number(e.target.value.replace(/,/g, "")))}
                />
              </div>

              {trucks.map((size, idx) => {
                const breakdown = getMarchAllocation(size);
                return (
                  <div key={idx} className="space-y-1">
                    <label className="block font-medium">
                      March {idx + 1} Size: <span className="text-sm text-gray-700">{breakdown[0].toLocaleString()} → {breakdown[1].toLocaleString()} → {breakdown[2].toLocaleString()}</span>
                    </label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={formatNumber(size)}
                        onFocus={handleInputFocus}
                        onChange={(e) => {
                          const updated = [...trucks];
                          updated[idx] = Number(e.target.value.replace(/,/g, ""));
                          setTrucks(updated);
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const updated = [...trucks];
                          updated[idx] = leaderTruck;
                          setTrucks(updated);
                        }}
                      >
                        ←
                      </Button>
                    </div>
                  </div>
                );
              })}
              <div className="flex gap-4 pt-2">
                <Button onClick={() => setTrucks([...trucks, 0])}>Add March</Button>
                <Button variant="outline" onClick={() => setTrucks(trucks.slice(0, -1))} disabled={trucks.length === 0}>
                  Remove March
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

