#!/usr/bin/env python3
import pygatt

SENSORTAG_MAC = "CC:78:AB:7F:5F:83"  # this is Ben's sensortag

adapter = pygatt.GATTToolBackend()


def handle_gyro(handle, value):
    print("---")
    print("> Received handle: %s" % handle)
    print("> Received data: %s" % value)
    print("---")


try:
    adapter.start()
    device = adapter.connect(SENSORTAG_MAC)
    device.subscribe(uuid="0xAA51", callback=handle_gyro)
finally:
    adapter.stop()
