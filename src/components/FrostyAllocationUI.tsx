import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";

const troopTypes = ["Infantry", "Lancer", "Marksman"];

const priorityOptions = [
  { label: "Infantry → Lancer → Marksman", value: "0,1,2" },
  { label: "Lancer → Marksman → Infantry", value: "1,2,0" },
  { label: "Marksman → Lancer → Infantry", value: "2,1,0" },
  { label: "Lancer → Infantry → Marksman", value: "1,0,2" },
  { label: "Infantry → Marksman → Lancer", value: "0,2,1" },
  { label: "Marksman → Infantry → Lancer", value: "2,0,1" },
];

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    // Optionally show toast/alert
    console.log("Copied:", text);
  });
};

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

  const SliderTicks = ({
    value,
    current,
    onClick,
  }: {
    value: number;
    current: number;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`text-xs px-1 py-0.5 rounded transition-colors duration-200 ${
        current === value * 10
          ? "bg-blue-600 text-white"
          : "text-gray-500 hover:text-blue-600"
      }`}
    >
      {value * 10}%
    </button>
  );
  const updatePercentage = (index: number, newValue: number) => {
    const updated = [...percentages];
    const totalExcludingCurrent = updated.reduce((sum, val, i) => i !== index ? sum + val : sum, 0);
    const cappedValue = Math.min(newValue, 100 - totalExcludingCurrent);
    updated[index] = cappedValue;
    setPercentages(updated);
  };
  
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#f7faff] p-4 md:p-10 text-[#1e3a8a] font-sans">
        <h1 className="text-3xl font-bold mb-6 text-center">Troop Allocation Planner</h1>
        <div className="flex justify-end mb-4">
  <Sheet>
    <SheetTrigger asChild>
    <Button variant="outline" className="flex items-center gap-1 px-3 py-1.5">
      <Info className="w-4 h-4" />
      
    </Button>

    </SheetTrigger>
    <SheetContent side="right" className="w-[300px] overflow-y-auto max-h-screen p-4">
      <SheetHeader>
        <SheetTitle>How to Use This Tool</SheetTitle>
        <SheetDescription>
          Plan and allocate troops efficiently using your desired percentages and march sizes.
        </SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-6 text-sm text-blue-900">
        <section>
          <h3 className="text-lg font-semibold mb-2">🔢 Main Functions</h3>
          <ul className="list-disc list-inside space-y-1">
                <li><strong>Tabs</strong> — Switch between saved presets or customize your own.</li>
                <li><strong>Available Troops</strong> — Enter your troop counts per type.</li>
                <li><strong>Target Percentages</strong> — Adjust sliders to set the desired distribution.</li>
                <li><strong>Adjusted Allocations</strong> — View how troops are automatically divided.</li>
                <li><strong>March Input</strong> — Set march sizes and see troop breakdowns per march.</li>
              </ul>
              <p className="pt-2 text-xs text-gray-500">Data is automatically saved per tab.</p>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">🔢 Main Functions</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Add March</strong> — Appends a new march input field for extra troop lines.</li>
            <li><strong>Remove March</strong> — Removes the last march input from the list.</li>
            <li><strong>← Button</strong> — Copies the Rally Caller’s march size to the current march.</li>
            <li><strong>+ / −</strong> — Fine-adjust each troop type's percentage (1% step).</li>
            <li><strong>Slider</strong> — Coarse-adjust each troop type’s % (10% step).</li>
            <li><strong>Tick Buttons</strong> — Quickly snap to predefined 10% increments.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">📊 Sequencing Logic</h3>
          <p>
            Troops are distributed according to the selected <strong>priority order</strong>. Rally Caller
            receives troops first. After that, other march lines are filled based on remaining availability and target ratios,
            and sequences.</p>
            <br/>
              <li><strong>PVE Tab</strong> — Infantry → Marksman → Lancer</li>
              <li><strong>Bear Tab</strong> — Marksman → Lancer → Infantry</li>
              <li><strong>Garrison Tab</strong> — Infantry → Lancer → Marksman</li>
              <li><strong>Small Garrison Tab</strong> — Infantry → Lancer → Marksman</li>
              <li><strong>Custom Tab</strong> — In the custom tab there is a dropdown that allows you to choose the sequences</li>
                  
        </section>
      </div>
          </SheetContent>
        </Sheet>
      </div>

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
                    <Input className="focus:ring-blue-500 focus:border-blue-500"
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          size="sm" 
                          variant="outline" 
                          onClick={() => updatePercentage(index, percentages[index] - 1)}>−
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-white text-black border shadow px-2 py-1 text-sm rounded">Decrease percentage
                      </TooltipContent>
                    </Tooltip>

                      <Slider 
                       className="flex-1
                        [data-part=track]:bg-blue-100
                        [data-part=range]:bg-blue-500
                        [&>div>div]:bg-blue-100
                        [&>div>div>div]:bg-blue-500"
                        value={[percentages[index]]}
                        onValueChange={(val) => updatePercentage(index, val[0])}
                        min={0}
                        max={100}
                        step={10}
                        //detents={true}                        
                      />
                    <Tooltip>
                      <TooltipTrigger asChild>    
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          size="sm" 
                          variant="outline" 
                          onClick={() => updatePercentage(index, percentages[index] + 1)}>+
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-white text-black border shadow px-2 py-1 text-sm rounded">Increase percentage</TooltipContent>
                    </Tooltip>
                    </div>
                    <div className="grid grid-cols-11 gap-1 px-2 mt-1">
                      {Array.from({ length: 11 }, (_, i) => (
                        <SliderTicks
                        key={i}
                        value={i}
                        current={percentages[index]}
                        onClick={() => updatePercentage(index, i * 10)}
                      />
                      
                      ))}
                    </div>
                  </div>
                ))}
                {tab !== "Small Guarison" && percentages.reduce((a, b) => a + b, 0) !== 100 && (
                  <Badge variant="destructive" className="mt-2">
                    Total percentage less than 100%
                  </Badge>
                )}
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
                  <div key={index} className="text-sm text-grey-800">
                    {type}:&nbsp;
                      <span
                        onClick={() => copyToClipboard(adjustedAllocations[index].toString())}
                        className="cursor-pointer underline text-blue-700 hover:text-blue-900"
                        title="Click to copy"
                      >
                        {adjustedAllocations[index].toLocaleString()}
                      </span>
                      &nbsp;/&nbsp;
                      <span
                        onClick={() => copyToClipboard(available[index].toString())}
                        className="cursor-pointer underline text-blue-700 hover:text-blue-900"
                        title="Click to copy"
                      >
                        {available[index].toLocaleString()}
                      </span>
                      &nbsp;(
                      <span
                        onClick={() => copyToClipboard(adjustedPercentages[index].toString())}
                        className="cursor-pointer underline text-blue-700 hover:text-blue-900"
                        title="Click to copy"
                      >
                        {adjustedPercentages[index]}%
                      </span>)

                    <div className="w-full bg-blue-100 rounded h-2 mt-1">
                      <div
                        className="bg-blue-500 h-2 rounded"
                        style={{ width: `${adjustedPercentages[index]}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                <div className="text-sm text-grey-600 mt-2">
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
                    Rally Caller March Size: <span className="text-sm text-blue-700">{leaderAllocations[0].toLocaleString()} → {leaderAllocations[1].toLocaleString()} → {leaderAllocations[2].toLocaleString()}</span>
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
                        March {idx + 1} Size: <span className="text-sm text-blue-700">{breakdown[0].toLocaleString()} → {breakdown[1].toLocaleString()} → {breakdown[2].toLocaleString()}</span>
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
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              size="sm"
                              onClick={() => {
                                const updated = [...trucks];
                                updated[idx] = leaderTruck;
                                setTrucks(updated);
                              }}
                            >
                              ←
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="bg-white text-black border shadow px-2 py-1 text-sm rounded">
                            Copy Rally Caller March Size
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-4 pt-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => setTrucks([...trucks, 0])}>Add March
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-white text-black border shadow px-2 py-1 text-sm rounded"> Add a new march line</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      variant="outline" 
                      onClick={() => setTrucks(trucks.slice(0, -1))} 
                      disabled={trucks.length === 0}>
                      Remove March
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-white text-black border shadow px-2 py-1 text-sm rounded"> Remove march line</TooltipContent>
                </Tooltip>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

